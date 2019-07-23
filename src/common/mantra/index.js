import { Buffer } from 'buffer'
import log from 'Common/log.js'
import send from './send.js'
import broadcast from './broadcast.js'
import { handleReply } from './reply.js'
import { getPosts } from './request/get/'

// Set.prototype.has, but for .equals equality
const has = (set, nid) =>
    Array.from(set.values()).reduce((acc, cur) => acc || cur.equals(nid), false)

const mantrasaProcessed = new Set()
const VERSION = 3
/*
    mantras scheme:
    'ping' -> 'pong'                   (req ping              res ping)
    'get posts' -> 'put posts'          req poemata get       res poemata get
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
        if (!has(peers, id)) {
            peers.add(id)
            getStateChangeHandler()('put peer', {nid: id})
        }
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
                log.error("Error during saving a post", error)
                // do nothing
            }
            poemataInitialized = true
            log.info('posts initialized')
            getStateChangeHandler()({type: 'posts initialized'})
        }
    })

    pr.on('message', async (mantra, from) => {
        if (!has(peers, from)) {
            peers.add(from)
            getStateChangeHandler()('put peer', {nid: from})
        }
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
            case 'req poema put': // v3
            case 'put post': { // v0
                if (!poemata.find(poema => poema.pid === mantra.post.pid)) {
                    broadcast(forwardedMantra, false, peers, pr)
                    // TODO: optimize: do not sent the post to nodes we know already have it
                    storePost(mantra.post)
                }
                //mantra.post.body = await getContent(mantra.post.bodyCid)
            }
            break

            case 'req content put perm': // v3
                if (isServerNode) {
                    send(forwardedMantra.origin, {type: 'res content put perm', permission: true, inReplyTo: mantra.mid}, false, pr)
                    broadcast(forwardedMantra, false, peers, pr) // idea: mantra itself should have a broadcast flag :)
                }
            break

            case 'res content put perm': // v3
                handleReply(mantra)
            break

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

            case 'req content put': // v3
                const cid = await toCID(mantra.payload)
                if (!contentStore.get(cid)) {
                    contentStore.set(cid, mantra.payload)
                    // do not rebroadcast?
                    send(forwardedMantra.origin, {type: 'res content put perm', status: 'success', inReplyTo: mantra.mid}, false, pr)
                }
            break

            case 'res content put': // v3
                handleReply(mantra)
            break

            case 'req content get': // v3
            case 'get content': { // v0; todo: split to query (~= head) and get
                const payload = contentStore.get(mantra.cid)
                if (payload) {
                    send(forwardedMantra.origin, {type: 'res content get', payload, inReplyTo: mantra.mid}, /*binary*/ true, pr)
                } else {
                    broadcast(forwardedMantra, true, peers, pr)
                }
            }
            break

            case 'res content get': // v3
            case 'content found': { // v0
                handleReply(mantra, mantra.payload)
            }
            break

            case 'ping': {
                send(from, {type: 'pong', inReplyTo: mantra.mid}, false, pr)
            }
            break

            case 'pong': 
                handleReply(mantra)
            break

            case 'req poemata get': // v3
            case 'get posts': { // v0
                send(forwardedMantra.origin, {type: 'put posts', posts: poemata, inReplyTo: mantra.mid}, false, pr)
                broadcast(forwardedMantra, false, peers, pr)
            }
            break

            case 'res poemata get': // v3
            case 'put posts': { // v0
                handleReply(mantra, mantra.posts)
            }
            break
        }
    })
}

export default addHandlers