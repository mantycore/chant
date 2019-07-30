import { Buffer } from 'buffer'
import log from 'Common/log.js'
import send from './send.js'
import broadcast from './broadcast.js'
import { handleReply, handleReplies } from './reply.js'
import { getPosts } from './request/get/'
import toCID from 'Common/cid.js'

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

        /* TODO: maybe do it on any new peer, not only on peer event? Study the peer-repaly protocol better. */
        if (true /*isServerNode*/) {
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
            log.info('posts initialized')
            getStateChangeHandler()({type: 'posts initialized'})
        } else {
            //getStateChangeHandler()({type: 'peer new', payload: })
        }
    })

/**/pr.on('message', async (mantra, from) => {
/**/    insertPeer(peers, from, {}, getStateChangeHandler)
/**/    if (mantra.type !== 'ping' && mantra.type !== 'pong') {
/**/        log.info('RECV', from.toString('hex', 0, 2), mantra)
/**/    }
/**/    const forwardedMantra = Object.assign({}, mantra, {origin: mantra.origin ? (
/**/        'data' in mantra.origin
/**/        ? Buffer.from(mantra.origin.data) // origin deserialized from text
/**/        : mantra.origin // from bson
/**/    ) : from})
/**/    {
/**/        const umid = `${forwardedMantra.origin.toString('hex')}:${mantra.mid}`
/**/        if (mantrasaProcessed.has(umid)) {
/**/            return
/**/        } else {
/**/            mantrasaProcessed.add(umid)
/**/        }
/**/    }
/**/    switch (mantra.type) {
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
                const cid = await toCID(mantra.payload.buffer) 
                if (!contentStore.get(cid)) {
                    contentStore.set(cid, {payload: mantra.payload}) //todo: counts
                    getStateChangeHandler()('put attachment', {cid, attachment: {payload: mantra.payload}})

                    // do not rebroadcast?
                }
                send(forwardedMantra.origin, {type: 'res content put', status: {persistent: isServerNode}, re: mantra.mid}, false, pr)
            break

/**/        case 'res content put':
/**/            handleReplies(from.toString('hex'), mantra, mantra.status)
/**/        break

/**/        case 'req content get': {// todo: split to query (~= head) and get to minimize traffic
/**/            const payload = contentStore.get(mantra.params.cid).payload //todo: think about it
/**/            if (payload) {
/**/                send(forwardedMantra.origin, {type: 'res content get', payload, re: mantra.mid}, /*binary*/ true, pr)
/**/            } else {
/**/                broadcast(forwardedMantra, true, peers, pr)
/**/            }
/**/        }
/**/        break

/**/        case 'res content get': {
/**/            handleReply(mantra, mantra.payload)
/**/        }
/**/        break

/**/        case 'ping': {
/**/            upsertPeer(peers, from, mantra.payload, getStateChangeHandler)
/**/            getStateChangeHandler()({type: 'peer status', payload: mantra.payload})
/**/            const payload = { //todo: dry with ping
/**/                type: isServerNode ? 'server' : 'browser',
/**/                persistent: isServerNode //TODO: think about better capabilities format
/**/            }
/**/            send(from, {type: 'pong', payload, re: mantra.mid}, false, pr)
/**/        }
/**/        break

/**/        case 'pong':
/**/            upsertPeer(peers, from, mantra.payload, getStateChangeHandler)
/**/            getStateChangeHandler()({type: 'peer status', payload: mantra.payload})
/**/            handleReply(mantra)
/**/        break

/**/        case 'req poemata get': {
/**/            let payload = poemata
                let params = mantra.params
                if (params) {
                    payload = poemata.filter(poema => 
                        (!params.pid || poema.pid === params.pid) &&
                        (!params.opid || (poema.opid && poema.opid === params.opid)) &&
                        (!params.tag || (poema.tags && poema.tags.includes(params.tag))) &&
                        (!params.rid || (poema.conversationId && poema.conversationId === params.rid))
                    )
                    // All of the selectors below may be implemented here, or may be implemented in the function
                    // creating the req-poemata-get request, probably in Maya.

                    // For each poema, it is also necessary to load all poemata having update ayah on it.

                    // It is not possible to find poemata by ayah if it is encrypted,
                    // so all updating poemata must be in the same renga as the updated one!
                    // (Or we need to allow for update ayah to be stored in haiku unencrypted)

                    // We also _could_ prefetch other kinds of ayah-linked poemata, posts referencing this with
                    // hyperlinks or referenced by it; and maybe something more. (And also prefetch content!)

                    // If we are displaying a tag, it is necessary to have all (or newest N) o-psalms in the tag.
                    // It is also possible to preload all sutras in the tag (or newest N); this must be handled not here,
                    // but in the code placing req-poemata-get.

                    // If we are displaying a sutra, we need all the psalms in the sutra (sharing the same opid)
                    // For each of these psalms, it that psalms starts a sutra, we also need _that_ sutra.
                    // For each of psalms of subsutra, we also need to know if there are further subsubsutra branches,
                    // but not necessary its psalmoi; however, current logic doesnt' allow to transfer
                    // this kind of metadata with the psalm.
                    // We also want a parent tag(s?) or parent sutra (or only those suwar from
                    // parent sutra which start a subsutra themselves)

                    // If we are displaying a psalm (in sutra), we want its parent sutra (or, if it is a head in a sutra, then that sutra)
                    // and all the related objects, see above.

                    // If we are displaying a renga, or a psalm belonging to renga, we want all the haiku with the matching rid.
                    // We also want the objects to display conversations list (see below). Maybe for renga psalms it is possible
                    // to display some parallel of subsutras (maybe a fact that there is a direct (subdirect? subrenga?) directed at 
                    // the renga psalm).

                    // To display conversations list, we want all the hokku and waki. It may be dificult to find just them.
                    // The simplest thing is to find all haiku directed to plain psalms (but see above on subrengas)
                    // It is also possible for user node to track rids and request only hokku + waki for specific rids;
                    // but maybe it is easier to just store hokku + waki locally.

                    // (It is also very ironic that hokku is the only unencrypted poema in renga; while haiku is an encrypted psalm.
                    // Think about terminology better.)
                }
/**/            send(forwardedMantra.origin, {type: 'res poemata get', payload, re: mantra.mid}, false, pr)
/**/            broadcast(forwardedMantra, false, peers, pr)
/**/        }
/**/        break

/**/        case 'res poemata get': {
/**/            handleReply(mantra, mantra.payload)
/**/        }
/**/        break
        }
    })
}

export default addHandlers