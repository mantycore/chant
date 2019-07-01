import toCID from './cid.js'
import { Buffer } from 'buffer'
import { createPost, processFiles, inner } from './createPost.js'
import BSON from 'bson'

import crypto from './crypto.js'
import bs58 from 'bs58'

const has = (set, nid) =>
    Array.from(set.values()).reduce((acc, cur) => acc || cur.equals(nid), false)

export default state => {

    const {isServerNode, pr} = state
    const peers = new Set()
    const contentStore = state.contentStore || new Map()

    // TODO: move to a separate module -------------------------------------------------------------
    const posts = state.posts || []
    const postsAggregated = []
    const aggregate = post => { //closed on postsAggregated
        let postAggregated;
        const updateProof = post.proofs && post.proofs.find(proof => proof.type === 'put' || proof.type === 'delete')
        // there should be no more than one
        if (updateProof) {
            //case 1: post has put/delete proofs, so there must be an original in pa
            postAggregated = postsAggregated.find(pa => pa.pid === updateProof.pid) // TODO: or else
            postAggregated.posts.push(post)
            postAggregated.posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            postAggregated.latest = postAggregated.posts[0]
        } else {
            //case 2: post has no proofs, so it must be new
            postAggregated = {
                pid: post.pid,
                posts: [post],
                latest: post
            }
            postsAggregated.push(postAggregated)
        }
        
        postsAggregated.sort(((a, b) => new Date(b.latest.timestamp) - new Date(a.latest.timestamp)))
        return postAggregated
    }
    posts.forEach(post => aggregate(post))
    // TODO: move to a separate module -------------------------------------------------------------

    const messagesProcessed = new Set()

    const generatePId = () => `${pr.id.toString('hex')}:${new Date().toISOString()}`

    const pr_send = (id, message, binary = false) => {
        const newMessage = Object.assign({}, message)
        let mid
        if (message.mid) {
            mid = message.mid
        } else {
            mid = new Date().toISOString()
            Object.assign(newMessage, {mid})
        }
        if (message.type !== 'ping' && message.type !== 'pong') {
            const {payload1: omit, ...messageSansPayload} = newMessage
            console.log("SEND", id.toString('hex', 0, 2), messageSansPayload) // JSON.stringify()
        }
        pr.send(id, newMessage, binary)
        return mid
    }

    const broadcast = message => { // closed on peers and pr
        const newMessage = Object.assign({}, message)
        let mid // TODO: think about better solution
        for (const peer of peers.values()) {
            // TODO: add already processed nodes
            if (!message.origin || !(peer.equals(message.origin))) {
                mid = pr_send(peer, newMessage)
                Object.assign(newMessage, {mid})
            }
        }
        return mid
    }

    let stateChangeHandler = () => {} // TODO: replace with messages
    const onStateChange = handler => stateChangeHandler = handler

    // --- REPLIES ---
    const repliesPending = new Map()

    const waitForReply = (mid, resolve, reject, timeout = 1000) => {
        repliesPending.set(mid, {resolve, reject, timestamp: new Date()})

        if (timeout) {
            setTimeout(() => {
              if (repliesPending.has(mid)) {
                reject()
                repliesPending.delete(mid)
              }
            }, timeout)
        }
    }

    const handleReply = (message, resolution, callback) => {
        if (repliesPending.has(message.inReplyTo)) {
            const {resolve, reject} = repliesPending.get(message.inReplyTo)
            repliesPending.delete(message.inReplyTo)
            resolve(resolution) // we can also use sender, etc
        }
    }

    // --- PUTTERS ---

    const putContent = async payload => {
        const cid = await toCID(payload)
        contentStore.set(cid, payload)
        broadcast({type: 'put content', payload})
        return cid
    }

    const putPostToStore = post => {
        posts.push(post)
        const postAggregated = aggregate(post)
        stateChangeHandler('put post', {post, postAggregated})
    }

    const revoke = async origin => {
        const post = await createPost({
            nid: pr.id,
            proofs: [{type: 'delete', post: origin}],
            opid: origin.opid,
            tags: origin.tags
        })

        /*console.log(post)
        console.log(crypto.proof.verify(
            BSON.serialize(inner(post)),
            bs58.decode(post.proofs[0].signature),
            BSON.serialize(inner(origin)),
            bs58.decode(origin.proofSignature),
            bs58.decode(origin.proofKey)
        ))*/
        putPostToStore(post)
        broadcast({type: 'put post', post})
    }

    const putPost = async({body, filesToLoad, opid, tags}) => {
        if (!filesToLoad && body.match(/^\s+$/)) {
           return
        }

        const [filesFull, attachments] = await processFiles(filesToLoad)
        const post = await createPost({
            body,
            attachments,
            nid: pr.id,
            opid,
            tags
        })

        if (post.body) {
            contentStore.set(post.body.cid, {type: 'text/plain', text: body, cid: post.body.cid}) // todo: regularize with files?
        }

        filesFull.forEach(file => {
            contentStore.set(file.cid, file)
        })

        console.log(post)
        putPostToStore(post)
        broadcast({type: 'put post', post})
    }

    // --- GETTERS ---

    const getContent = async cid => new Promise((resolve, reject) => {
        const mid = pr_send(Array.from(peers)[0], {type: 'get content', cid}) //NB! only one reply is handled. Needs fixing
        waitForReply(mid, resolve, reject, 10000)
    })
    
    const ping = async peer => new Promise((resolve, reject) => {
        const mid = pr_send(peer, {type: 'ping'})
        waitForReply(mid, resolve, reject)
    })
    
    const getPosts = async peer => new Promise((resolve, reject) => {
        const mid = pr_send(peer, {type: 'get posts'})
        waitForReply(mid, resolve, reject)
    })

    // --- THINGS THAT USE GETTERS ---

    const getAndStoreContent = async cid => {
        try {
            const attachment = await getContent(cid)
            const storageAttachment = {...attachment, buffer: attachment.buffer.buffer}
            contentStore.set(cid, storageAttachment)
            stateChangeHandler('put attachment', {cid, attachment: storageAttachment})
        } catch (e) {
            console.log(e)
        }
    }

    setInterval(async () => {
        for (const peer of peers.values()) {
            try {
                await ping(peer)
            } catch (error) {
                peers.delete(peer)
                stateChangeHandler('delete peer', {nid: peer})
            }
        }
    }, 10000)

    let postInitialized = false
    pr.on('peer', async id => {
        console.log('PEER', id.toString('hex', 0, 2))
        if (!has(peers, id)) {
            peers.add(id)
            stateChangeHandler('put peer', {nid: id})
        }
        if (!postInitialized) {
            try {
                const newPosts = await getPosts(id)
                for (const post of newPosts) {
                    if (!posts.find(localPost => localPost.pid == post.pid)) {
                        storePost(post)
                    }
                    //posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    //stateChangeHandler()
                }
                postInitialized = true
            } catch (error) {
                // do nothing
            }
        }
    })

    const storePost = post => {
        putPostToStore(post) //TODO: simplify calls and naming scheme

        if (isServerNode) {
            if (post.attachments) {
                post.attachments.map(async attachment => {
                    if (!contentStore.get(attachment.cid)) {
                        try {
                            await getAndStoreContent(attachment.cid) //stateChangeHandler is fired inside; think if it is good solution
                        } catch(e) {
                            console.log("timeout (10s) on waiting the attachment", attachment)
                        }
                    }
                })
            }
        }
    }

    Object.assign(state, {
        peers,
        contentStore,
        posts,
        postsAggregated,
        messagesProcessed,

        putContent,
        getContent,
        putPost,
        repliesPending,

        revoke,

        getAndStoreContent,

        onStateChange,

        Buffer,
        toCID,
        BSON
    })

    /*
    messages scheme:
    'ping' -> 'pong'
    'get posts' -> 'put posts'
    'get content' -> 'content found'

    'put post' (=> 'get content')
    'put content'

    TODO: regularize the scheme
    */

    pr.on('message', async (message, from) => {
        if (!has(peers, from)) {
            peers.add(from)
            stateChangeHandler('put peer', {nid: from})
        }
        if (message.type !== 'ping' && message.type !== 'pong') {
            const {payload1: omit, ...messageSansPayload} = message
            console.log('RECV', from.toString('hex', 0, 2), messageSansPayload) //JSON.stringify(messageSansPayload)
        }
        const forwardedMessage = Object.assign({}, message, {origin: message.origin ? Buffer.from(message.origin.data) : from})
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
                    broadcast(forwardedMessage)
                    // TODO: optimize: do not sent the post to nodes we know already have it
                    storePost(message.post)
                }
                //message.post.body = await getContent(message.post.bodyCid)
                break
            }

            case 'put content': { //not used for now
                const cid = await toCID(message.payload);
                if (!contentStore.get(cid)) {
                    contentStore.set(cid, message.payload)
                    broadcast(forwardedMessage) 
                     // TODO: optimize: do not sent the post to nodes we know already have it
                     // TODO: optimize: send only to server nodes? or, better, send to all nodes, but only server nodes should store it.
                }
                break
            }

            case 'get content': { // todo: split to query (~= head) and get
                const payload = contentStore.get(message.cid)
                if (payload) {
                    pr_send(forwardedMessage.origin, {type: 'content found', payload, inReplyTo: message.mid}, /*binary*/ true)
                } else {
                    broadcast(forwardedMessage)
                }
                break
            }
            case 'content found': {
                handleReply(message, message.payload)
                break
            }

            case 'ping': {
                pr_send(from, {type: 'pong', inReplyTo: message.mid})
                break
            }
            case 'pong': 
                handleReply(message)
                break

            case 'get posts': {
                pr_send(forwardedMessage.origin, {type: 'put posts', posts, inReplyTo: message.mid})
                broadcast(forwardedMessage)
                break
            }
            case 'put posts': {
                handleReply(message, message.posts)
                break
            }
        }
    })
}

/*

post structure:
id (id)
thread (id) // original post 
- or -
tags (array of strings/tagids)
text (cid) // body
attachments (array of cids)

*/
