import { Buffer } from 'buffer'
import BSON from 'bson'
import msgpack from 'msgpack-lite'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import base64 from 'base64-js'


import toCID from './cid.js'
import crypto from './crypto.js'


import addHandlers from './mantra/'
import { getContent, ping } from './mantra/request/get/'
import broadcast from './mantra/broadcast.js'

import createPost from './psalm/createPost.js'
import inner from './psalm/inner.js'
import processFiles from './psalm/processFiles.js'
import asBuffer, {asBufferPlain} from './psalm/asBuffer.js'

import aggregate from './surah/'


export default state => {

    const {isServerNode, pr} = state
    const peers = new Set()
    const contentStore = state.contentStore || new Map()

    let stateChangeHandler = () => {} // TODO: replace with messages
    const onStateChange = handler => stateChangeHandler = handler
    // --- THINGS THAT USE GETTERS ---

    const getAndStoreContent = async cid => {
        try {
            const attachment = await getContent(cid, peers, pr) // mantra/request
            const storageAttachment = {...attachment, buffer: attachment.buffer} //BSON: buffer(Binary).buffer; msgpack: just buffer
            contentStore.set(cid, storageAttachment)
            stateChangeHandler('put attachment', {cid, attachment: storageAttachment})
            return {cid, attachment: storageAttachment}
        } catch (e) {
            console.log("Exception durig getting content file #", cid, e)
            throw e
        }
    }

    // TODO: move to a separate module -------------------------------------------------------------
    const posts = state.posts || []
    const postsAggregated = []
    const conversations = []

    posts.forEach(post => aggregate(
        post,
        postsAggregated, // modified as a result
        contentStore, // modified as a result
        () => stateChangeHandler, // called as a result
        conversations, // modified as a result
        getAndStoreContent
    ))
    // TODO: move to a separate module -------------------------------------------------------------
    //const generatePId = () => `${pr.id.toString('hex')}:${new Date().toISOString()}`
    //obsolete
    // --- PUTTERS ---

    const putContent = async payload => {
        const cid = await toCID(payload)
        contentStore.set(cid, payload)
        broadcast({type: 'put content', payload}, false, peers, pr)
        return cid
    }

    const putPostToStore = post => {
        if (post.opid === null) {
            delete post.opid // hacky, improve
        }
        posts.push(post)
        const postAggregated = aggregate(
            post,
            postsAggregated, // modified as a result
            contentStore, // modified as a result
            () => stateChangeHandler, // called as a result
            conversations, // modified as a result
            getAndStoreContent
        )
        stateChangeHandler('put post', {post, postAggregated})
    }

    const revoke = async origin => {
        const post = await createPost({
            nid: pr.id,
            proofs: [{type: 'delete', post: origin}]
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
        broadcast({type: 'put post', post}, false, peers, pr)
    }

    const updatePost = async (update, origin, mode) => {
        let post;

        let proofs = []
        if (update.body) {
            const signaturesMarkup = update.body.match(/~[a-zA-Z0-9]{64,88}/g)
            if (signaturesMarkup) {
                proofs = signaturesMarkup
                    .map(s => s.substring(1))
                    .map(pid => posts.find(post => post.pid === pid))
                    .map(post => ({type: 'hand', post}))
            }
        }

        if (mode === 'patch') {
            post = await createPost({
                nid: pr.id,
                ...update,
                proofs: [{type: 'patch', post: origin}].concat(proofs)
            })
        } else if (mode === 'put') { // untested, written just in case
            const params = {
                nid: pr.id,
                ...(Object.assign(update, inner(origin)))
            }
            params.proofs = (params.proofs || []).concat(proofs)
            params.proofs.push({type: 'put', post: origin})
            post = await createPost()
        }
        putPostToStore(post)
        broadcast({type: 'put post', post}, false, peers, pr)
    }

    const putPost = async({body, filesToLoad, opid, tags, to, conversationId}) => {
        if (!filesToLoad && body.match(/^\s+$/)) {
           return
        }
        const [filesFull, attachments] = await processFiles(filesToLoad)

        let proofs = null
        const signaturesMarkup = body.match(/~[a-zA-Z0-9]{64,88}/g)
        if (signaturesMarkup) {
            proofs = signaturesMarkup
                .map(s => s.substring(1))
                .map(pid => posts.find(post => post.pid === pid))
                .map(post => ({type: 'hand', post}))
        }

        const post = await createPost({
            body,
            attachments,
            nid: pr.id,
            opid,
            tags,
            proofs,
            conversationId
        })

        if (to) {
            const nonce = bs58.decode(post.pid).slice(0, 24)
            const toPost = postsAggregated.find(curPost => curPost.pid === to)
            const recipientDirectKey = bs58.decode(toPost.origin.directKey)
            const secretKey = crypto.direct.secretKey(recipientDirectKey, nonce)

            const contentMap = {}

            if (post.body) {
                const encryptedBody = nacl.secretbox(Buffer.from(body), nonce, secretKey.itself)
                const cid = await toCID(encryptedBody)
                contentStore.set(cid, {type: 'application/octet-stream', buffer: encryptedBody, cid})
                contentStore.set(post.body.cid, {type: 'text/plain', text: body, cid: post.body.cid, private: true}) // todo: regularize with files?
                contentMap[post.body.cid] = cid
            }

            for (const file of filesFull) {
                //{buffer: buffers[i], cid: cids[i], type: file.type, name: file.name, size: file.size}
                const encryptedAttachment = nacl.secretbox(file.buffer, nonce, secretKey.itself)
                const cid = await toCID(encryptedAttachment)
                contentStore.set(cid, {type: 'application/octet-stream', buffer: encryptedAttachment, cid, size: encryptedAttachment.length})
                contentStore.set(file.cid, {...file, private: true})
                contentMap[file.cid] = cid
            }

            Object.assign(post, {contentMap}) // counts as a part of outer post

            const ciphertext = nacl.secretbox(asBufferPlain(post), nonce, secretKey.itself) //BSON instead of Buffer.from(microjson(post)?

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
            broadcast({type: 'put post', post: encryptedPost}, false, peers, pr)
            return encryptedPost.pid
        } else {
            if (post.body) {
                contentStore.set(post.body.cid, {type: 'text/plain', text: body, cid: post.body.cid}) // todo: regularize with files?
            }

            filesFull.forEach(file => {
                contentStore.set(file.cid, file)
            })

            putPostToStore(post)
            broadcast({type: 'put post', post}, false, peers, pr)
            return post.pid
        }
    }

    // --- THINGS THAT USE GETTERS II ---

    setInterval(async () => {
        for (const peer of peers.values()) {
            try {
                await ping(peer, pr) // mantra/request
            } catch (error) {
                peers.delete(peer)
                stateChangeHandler('delete peer', {nid: peer})
            }
        }
    }, 10000)

    let postInitialized = false

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
        // messagesProcessed, // mantra/ internal
        conversations,

        putContent,
        getContent, // mantra/request
        putPost,
        //repliesPending, // mantra/reply internal

        revoke,
        updatePost,

        getAndStoreContent,

        onStateChange,

        Buffer,
        toCID,
        BSON,
        // microjson,
        crypto
    })

    addHandlers({
        pr,
        peers,
        posts,
        getStateChangeHandler: () => stateChangeHandler,
        storePost,
        contentStore,
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
