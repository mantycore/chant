import { Buffer } from 'buffer'
import log from 'Common/log.js'
import send from './send.js'
import broadcast from './broadcast.js'
import { handleReply } from './reply.js'
import { getPosts } from './request/get/'

// Set.prototype.has, but for .equals equality
//const has = (map, nid) =>
//    Array.from(map.keys()).find(cur => cur.equals(nid))

const insertPeer = (peers, nid, payload, getStateChangeHandler) => {
    if (peers.has(nid.toString('hex'))) { return }
    upsertPeer(peers, nid, payload, getStateChangeHandler)
}

const upsertPeer = (peers, nid, payload, getStateChangeHandler) => {
    peers.set(nid.toString('hex'), {nid, ...payload})
    getStateChangeHandler()('put peer', {nid})
}

const mantrasaProcessed = new Set()
const VERSION = 3
/*
    mantras scheme:
    'ping' -> 'pong'                   (req status get        res status get)

    'get posts' -> 'put posts'          req poemata get       res poemata get
                                        req content head      res content head ?
    'get content' -> 'content found'    req content get       res content get

    'put post' (=> 'get content')       req poema put         res poema put
                                        req content put perm  res content put perm
    'put content'                       req content put       res content put

    TODO: regularize the scheme
*/

let poemataInitialized = false

const addHandlers = ({
    pr,
    peers,
    poemata,
    getStateChangeHandler,
    storePost,
    contentStore,
    isServerNode
}) => {
    pr.on('peer', async id => {
        log.info('PEER', id.toString('hex', 0, 2))
        insertPeer(peers, id, {}, getStateChangeHandler)
        if (!poemataInitialized) {
            try {
                const newPoemata = await getPosts(id, pr)
                for (const newPoema of newPoemata) {
                    if (!poemata.find(localPoema => localPoema.pid == newPoema.pid)) {
                        storePost(newPoema)
                    }
                    //posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    //stateChangeHandler()
                }
            } catch (error) {
                log.error("Error during getting and storing poemata from a remote node", error)
                // do nothing
            }
            poemataInitialized = true
            log.info('posts initialized')
            getStateChangeHandler()({type: 'posts initialized'})
        }
    })

    pr.on('message', async (mantra, from) => {
        insertPeer(peers, from, {}, getStateChangeHandler)
        if (mantra.type !== 'ping' && mantra.type !== 'pong') {
            log.info('RECV', from.toString('hex', 0, 2), mantra)
        }
        const forwardedMantra = Object.assign({}, mantra, {origin: mantra.origin ? (
            'data' in mantra.origin
            ? Buffer.from(mantra.origin.data) // origin deserialized from text
            : mantra.origin // from bson
        ) : from})
        {
            const umid = `${forwardedMantra.origin.toString('hex')}:${mantra.mid}`
            if (mantrasaProcessed.has(umid)) {
                return
            } else {
                mantrasaProcessed.add(umid)
            }
        }
        switch (mantra.type) {
            case 'req poema put': {
                if (!poemata.find(poema => poema.pid === mantra.payload.pid)) {
                    broadcast(forwardedMantra, false, peers, pr)
                    // TODO: optimize: do not sent the post to nodes we know already have it
                    storePost(mantra.payload)
                }
                //mantra.post.body = await getContent(mantra.post.bodyCid)
            }
            break

            case 'res poema put':
            break

            /*
            permission to put content will be handled by ping/pong

            case 'req content put perm':
                if (isServerNode) {
                    send(forwardedMantra.origin, {type: 'res content put perm', status: true, re: mantra.mid}, false, pr)
                    broadcast(forwardedMantra, false, peers, pr) // idea: mantra itself should have a broadcast flag :)
                }
            break

            case 'res content put perm':
                handleReply(mantra)
            break
            */

            /*case 'put content': { //not used for now
                const cid = await toCID(mantra.payload);
                if (!contentStore.get(cid)) {
                    contentStore.set(cid, mantra.payload)
                    broadcast(forwardedMantra) 
                     // TODO: optimize: do not sent the post to nodes we know already have it
                     // TODO: optimize: send only to server nodes? or, better, send to all nodes, but only server nodes should store it.
                }
            }
            break*/

            case 'req content put':
                const cid = await toCID(mantra.payload)
                if (!contentStore.get(cid)) {
                    contentStore.set(cid, mantra.payload)
                    // do not rebroadcast?
                    send(forwardedMantra.origin, {type: 'res content put perm', status: 'success', re: mantra.mid}, false, pr)
                }
            break

            case 'res content put':
                handleReply(mantra)
            break

            case 'req content get': {// todo: split to query (~= head) and get to minimize traffic
                const payload = contentStore.get(mantra.params.cid)
                if (payload) {
                    send(forwardedMantra.origin, {type: 'res content get', payload, re: mantra.mid}, /*binary*/ true, pr)
                } else {
                    broadcast(forwardedMantra, true, peers, pr)
                }
            }
            break

            case 'res content get': {
                handleReply(mantra, mantra.payload)
            }
            break

            case 'ping': {
                upsertPeer(peers, from, mantra.payload, getStateChangeHandler)
                const payload = { //todo: dry with ping
                    type: isServerNode ? 'server' : 'browser',
                    persistent: isServerNode //TODO: think about better capabilities format
                }
                send(from, {type: 'pong', payload, re: mantra.mid}, false, pr)
            }
            break

            case 'pong':
                upsertPeer(peers, from, mantra.payload, getStateChangeHandler)
                handleReply(mantra)
            break

            case 'req poemata get': {
                send(forwardedMantra.origin, {type: 'res poemata get', payload: poemata, re: mantra.mid}, false, pr)
                broadcast(forwardedMantra, false, peers, pr)
            }
            break

            case 'res poemata get': {
                handleReply(mantra, mantra.payload)
            }
            break
        }
    })
}

export default addHandlers