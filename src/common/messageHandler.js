import toCID from './cid.js'
import { Buffer } from 'buffer'
import { createPost, processFiles, inner } from './createPost.js'
import BSON from 'bson'

import crypto from './crypto.js'
import bs58 from 'bs58'
import microjson from './microjson.js'
import nacl from 'tweetnacl'
import base64 from 'base64-js'

const has = (set, nid) =>
    Array.from(set.values()).reduce((acc, cur) => acc || cur.equals(nid), false)

const asBuffer = post => Buffer.from(microjson(inner(post)))

export default state => {

    const {isServerNode, pr} = state
    const peers = new Set()
    const contentStore = state.contentStore || new Map()

    // TODO: move to a separate module -------------------------------------------------------------
    const posts = state.posts || []
    const postsAggregated = []
    const aggregate = post => { //closed on postsAggregated
        let postAggregated;
        let plainPost;
        let directSide;

        if (post.to) {
            const nonce = bs58.decode(post.pid).slice(0, 24)
            const ciphertext = base64.toByteArray(post.ciphertext)
            let secretKey = crypto.direct.decryptKeyAsSender(base64.toByteArray(post.senderKey), nonce)
            const my = secretKey !== null
            if (my) {
                plainPost = JSON.parse(Buffer.from(
                    nacl.secretbox.open(ciphertext, nonce, secretKey)
                ).toString())
                directSide = 'my'
            } else {
                let origin;
                let encryptedKey;
                post.to.forEach(recipient => {
                    const originCandidate = postsAggregated.find(pa => pa.pid === recipient.pid)
                    if (originCandidate && originCandidate.my) {
                        origin = originCandidate
                        encryptedKey = base64.toByteArray(recipient.key)
                    }
                })
                if (origin) {
                    secretKey = crypto.direct.decryptKeyAsRecipient(encryptedKey, asBuffer(origin.origin))
                    plainPost = JSON.parse(Buffer.from(
                        nacl.secretbox.open(ciphertext, nonce, secretKey)
                    ).toString())
                    directSide = 'their'
                } else {
                    plainPost = null
                    directSide = 'unknown'
                }
            }
        } else {
            plainPost = post
        }
        if (directSide !== 'unknown') {
            const updateProof = plainPost.proofs && plainPost.proofs.find(proof => proof.type === 'put' || proof.type === 'delete')
            // there should be no more than one
            if (updateProof) {
                //case 1: post has put/delete proofs, so there must be an original in pa
                postAggregated = postsAggregated.find(pa => pa.pid === updateProof.pid) // TODO: or else
                postAggregated.posts.push(plainPost)
                postAggregated.posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                postAggregated.latest = postAggregated.posts[0]
            } else {
                //case 2: post has no proofs, so it must be new

                /*console.log("LOAD CHECK")
                console.log(plainPost.directKey)
                console.log(microjson(inner(plainPost)))
                console.log(bs58.encode( Buffer.from(microjson(inner(plainPost))) ))
                console.log(bs58.encode(crypto.direct.signOrigin( Buffer.from(microjson(inner(plainPost))) )))
                console.log(bs58.decode(plainPost.directKey).equals(Buffer.from(crypto.direct.signOrigin( Buffer.from(microjson(inner(plainPost))) ))))
                */

                postAggregated = {
                    pid: plainPost.pid,
                    posts: [plainPost],
                    origin: plainPost,
                    latest: plainPost,
                    my: bs58.decode(plainPost.directKey).equals(      // Buffer
                        Buffer.from(                             // Buffer
                            crypto.direct.signOrigin(            // Uint8Array
                                asBuffer(plainPost))))                // Buffer
                }
                if (directSide) {
                    Object.assign(postAggregated, {to: post.to, encrypted: directSide})
                }
                postsAggregated.push(postAggregated)
            }
        } else {
            const minimalPost = {
                pid: post.pid,
                timestamp: post.timestamp,
                version: post.version
            }
            postAggregated = {
                pid: post.pid,
                posts: [minimalPost],
                origin: minimalPost,
                latest: minimalPost,
                my: false,
                to: post.to,
                encrypted: 'unknown'
            }
        }
        postsAggregated.sort(((a, b) => new Date(b.origin.timestamp) - new Date(a.origin.timestamp)))
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
        if (post.opid === null) {
            delete post.opid // hacky, improve
        }
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

    const putPost = async({body, filesToLoad, opid, tags, to}) => {
        if (!filesToLoad && body.match(/^\s+$/)) {
           return
        }

        if (to) {
            const [filesFull, attachments] = await processFiles(filesToLoad)
            const post = await createPost({
                body,
                attachments,
                nid: pr.id,
                opid,
                tags
            })
            const nonce = bs58.decode(post.pid).slice(0, 24)
            const toPost = posts.find(curPost => curPost.pid === to)
            const recipientDirectKey = bs58.decode(toPost.directKey)
            const secretKey = crypto.direct.secretKey(recipientDirectKey, nonce)

            const contentMap = {}

            if (post.body) {
                const encryptedBody = nacl.secretbox(Buffer.from(body), nonce, secretKey.itself)
                const cid = await toCID(encryptedBody)
                contentStore.set(post.body.cid, {type: 'application/octet-stream', buffer: encryptedBody, cid})
                contentMap[post.body.cid] = cid
            }

            for (const file of filesFull) {
                //{buffer: buffers[i], cid: cids[i], type: file.type, name: file.name, size: file.size}
                const encryptedAttachment = nacl.secretbox(file.buffer, nonce, secretKey.itself)
                const cid = await toCID(encryptedAttachment)
                contentStore.set(cid, {type: 'application/octet-stream', buffer: encryptedAttachment, cid, size: encryptedAttachment.length})
                contentMap[file.cid] = cid
            }

            Object.assign(post, {contentMap}) // counts as a part of outer post

            const ciphertext = nacl.secretbox(Buffer.from(microjson(post)), nonce, secretKey.itself) //BSON instead of Buffer.from(microjson(post)?

            const encryptedPost = {
                ciphertext: base64.fromByteArray(ciphertext),
                to: [{
                    pid: to,
                    key: base64.fromByteArray(secretKey.encryptedForRecipient)
                }],
                senderKey: base64.fromByteArray(secretKey.encryptedForSender),
                timestamp: post.timestamp,
                pid: post.pid,
                version: post.version
            }

            //console.log(encryptedPost)

            // how to know if the sender of the post is me? try calling
            //crypto.direct.decryptSecretKey(base64.toByteArray(encryptedPost.secretKeyForSender), nonce1)
            // null (failure to decrypt) indicates that this is from someone's else

            // const nonce1 = bs58.decode(post.pid).slice(1, 25);
            // console.log(crypto.direct.decryptSecretKey(base64.toByteArray(encryptedPost.secretKeyForSender), nonce1))
            /*console.log(JSON.parse(Buffer.from(nacl.secretbox.open(
                base64.toByteArray(encryptedPost.ciphertext),
                nonce1,
                crypto.direct.decryptSecretKey(base64.toByteArray(encryptedPost.secretKeyForSender), nonce1)
            )).toString()))*/

            //todo: encrypted files and post body for directs
            //const directKey = bs58.decode(toPost.directKey).directKey
            //const encrypt = buffer => crypto.direct.encrypt(buffer, directKey)
            //const [filesFull, attachments] = await processFiles(filesToLoad, encrypt)

            //const decrypted = crypto.direct.decrypt(encrypted, Buffer.from(microjson(inner(toPost))))
            putPostToStore(encryptedPost)
            broadcast({type: 'put post', post: encryptedPost})
        } else {
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

            putPostToStore(post)
            broadcast({type: 'put post', post})
        }
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
                stateChangeHandler({type: 'posts initialized'})
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
        BSON,
        microjson,
        crypto
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
