import { Buffer } from 'buffer'
import log from 'Common/log.js'
import send from './send.js'
import broadcast from './broadcast.js'
import { handleReply } from './reply.js'
import { getPosts } from './request/get/'

// Set.prototype.has, but for .equals equality
const has = (set, nid) =>
    Array.from(set.values()).reduce((acc, cur) => acc || cur.equals(nid), false)

const messagesProcessed = new Set()

/*
    messages scheme:
    'ping' -> 'pong'
    'get posts' -> 'put posts'
    'get content' -> 'content found'

    'put post' (=> 'get content')
    'put content'

    TODO: regularize the scheme
*/

let postInitialized = false

const addHandlers = ({
    pr,
    peers,
    posts,
    getStateChangeHandler,
    storePost,
    contentStore
}) => {
    pr.on('peer', async id => {
        log.info('PEER', id.toString('hex', 0, 2))
        if (!has(peers, id)) {
            peers.add(id)
            getStateChangeHandler()('put peer', {nid: id})
        }
        if (!postInitialized) {
            try {
                const newPosts = await getPosts(id, pr)
                for (const post of newPosts) {
                    if (!posts.find(localPost => localPost.pid == post.pid)) {
                        storePost(post)
                    }
                    //posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    //stateChangeHandler()
                }
            } catch (error) {
                log.error("Error during saving a post", error)
                // do nothing
            }
            postInitialized = true
            log.info('posts initialized')
            getStateChangeHandler()({type: 'posts initialized'})
        }
    })

    pr.on('message', async (message, from) => {
        if (!has(peers, from)) {
            peers.add(from)
            getStateChangeHandler()('put peer', {nid: from})
        }
        if (message.type !== 'ping' && message.type !== 'pong') {
            log.info('RECV', from.toString('hex', 0, 2), message)
        }
        const forwardedMessage = Object.assign({}, message, {origin: message.origin ? (
            'data' in message.origin
            ? Buffer.from(message.origin.data) // origin deserialized from text
            : message.origin // from bson
        ) : from})
        {
            const umid = `${forwardedMessage.origin.toString('hex')}:${message.mid}`
            if (messagesProcessed.has(umid)) {
                return
            } else {
                messagesProcessed.add(umid)
            }
        }
        switch (message.type) {
            case 'put post': {
                if (!posts.find(post => post.pid === message.post.pid)) {
                    broadcast(forwardedMessage, false, peers, pr)
                    // TODO: optimize: do not sent the post to nodes we know already have it
                    storePost(message.post)
                }
                //message.post.body = await getContent(message.post.bodyCid)
            }
            break

            /*case 'put content': { //not used for now
                const cid = await toCID(message.payload);
                if (!contentStore.get(cid)) {
                    contentStore.set(cid, message.payload)
                    broadcast(forwardedMessage) 
                     // TODO: optimize: do not sent the post to nodes we know already have it
                     // TODO: optimize: send only to server nodes? or, better, send to all nodes, but only server nodes should store it.
                }
            }
            break*/

            case 'get content': { // todo: split to query (~= head) and get
                const payload = contentStore.get(message.cid)
                if (payload) {
                    send(forwardedMessage.origin, {type: 'content found', payload, inReplyTo: message.mid}, /*binary*/ true, pr)
                } else {
                    broadcast(forwardedMessage, true, peers, pr)
                }
            }
            break

            case 'content found': {
                handleReply(message, message.payload)
            }
            break

            case 'ping': {
                send(from, {type: 'pong', inReplyTo: message.mid}, false, pr)
            }
            break

            case 'pong': 
                handleReply(message)
            break

            case 'get posts': {
                send(forwardedMessage.origin, {type: 'put posts', posts, inReplyTo: message.mid}, false, pr)
                broadcast(forwardedMessage, false, peers, pr)
            }
            break

            case 'put posts': {
                handleReply(message, message.posts)
            }
            break
        }
    })
}

export default addHandlers