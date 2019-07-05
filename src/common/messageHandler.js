import toCID from './cid.js'
import { Buffer } from 'buffer'
import { createPost, processFiles, inner } from './createPost.js'
import BSON from 'bson'
import msgpack from 'msgpack-lite'

import crypto from './crypto.js'
import bs58 from 'bs58'
import microjson from './microjson.js'
import nacl from 'tweetnacl'
import base64 from 'base64-js'

import addHandlers from './mantra/'
import { waitForReply } from './mantra/reply.js'
import { getContent } from './mantra/request/'

const asBuffer = post => Buffer.from(microjson(inner(post)))

const verify = (post, proof, original) => crypto.proof.verify(
    Buffer.from(microjson(inner(post))),
    bs58.decode(proof.signature),
    Buffer.from(microjson(inner(original))),
    bs58.decode(original.proofSignature),
    bs58.decode(original.proofKey))


export default state => {

    const {isServerNode, pr} = state
    const peers = new Set()
    const contentStore = state.contentStore || new Map()

    // TODO: move to a separate module -------------------------------------------------------------
    const posts = state.posts || []
    const postsAggregated = []
    const conversations = []

    // 3 (Ayah), closed on postsAggregated, conversations
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

            // Encrypted content
            if (directSide !== 'unknown') {
                Object.entries(plainPost.contentMap).forEach(([cidPlain, cidEncrypted]) => {
                    if (!contentStore.has(cidPlain)) {
                        getAndStoreContent(cidEncrypted).then(result => {
                            const {cid, attachment} = result
                            const contents = [plainPost.body, ...(plainPost.attachments ? plainPost.attachments : [])]
                            const content = contents.find(c => c.cid === cidPlain)
                            const decryptedAttachment = Buffer.from(nacl.secretbox.open(attachment.buffer, nonce, secretKey))
                            contentStore.set(cidPlain, {...content, buffer: decryptedAttachment})
                            stateChangeHandler('put attachment', {cid: cidPlain, attachment: {...content, buffer: decryptedAttachment}, private: true})
                        })
                    }
                })
            }
        } else {
            plainPost = post
        }
        if (directSide !== 'unknown') {
            const updateProof = plainPost.proofs && plainPost.proofs.find(proof =>
                proof.type === 'put' ||
                proof.type === 'patch' ||
                proof.type === 'delete')
            // there should be no more than one
            if (updateProof) {
                //case 1: post has put/delete proofs, so there must be an original in pa
                postAggregated = postsAggregated.find(pa => pa.pid === updateProof.pid) // TODO: or else
                postAggregated.posts.push(plainPost)
                postAggregated.posts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                //postAggregated.latest = postAggregated.posts[postAggregated.posts.length - 1]

                // curently this is the code for body updating only.
                // it doesn't support attachemnt addition or deletion,
                // and may or may not support other operations.
                // generally, primitive values are updated correctly,
                // but arrays can be put but not patched.
                // TODO: massive rewrite?
                let result = {
                    ...inner(postAggregated.origin),
                    ...(postAggregated.origin.proofs ? {proofs: [...postAggregated.origin.proofs]} : {}),
                    ...(postAggregated.origin.contentMap ? {contentMap: {...postAggregated.origin.contentMap}} : {})
                }

                if (result.proofs) {
                    for (const proof of result.proofs) {
                        Object.assign(proof, {from: postAggregated.pid})
                    }
                }

                for (const postVersion of postAggregated.posts) {
                    const versionProof = postVersion.proofs && postVersion.proofs.find(curProof => curProof.pid === postAggregated.pid)
                    if (versionProof) { //there is no proof only if this is origin
                        if (verify(postVersion, versionProof, postAggregated.origin)) {
                            switch (versionProof.type) {
                                case 'patch':
                                    Object.assign(result, inner(postVersion))

                                    result.proofs = result.proofs || []
                                    for (const p of postVersion.proofs) {
                                        if (!postAggregated.origin.proofs || !postAggregated.origin.proofs.find(pp => pp.pid === p.pid)) {
                                            // todo: decide if it is necessary or safe to push updating proofs
                                            result.proofs.push({...p, from: postVersion.pid})
                                        }
                                    }
                                    
                                    if (result.contentMap || postVersion.contentMap) {
                                        result.contentMap = postVersion.contentMap && Object.keys(postVersion.contentMap).length > 0
                                            ? postVersion.contentMap
                                            : result.contentMap // replaced only if the patch has new content map
                                    }
                                    Object.keys(result).forEach(key => {
                                        if (result[key] === '$delete') {
                                            delete result[key] // somewhat hacky
                                        }
                                    })
                                    break
                                case 'put':
                                    result = {...inner(postVersion)}
                                    result.proofs = postVersion.proofs //are always replaced whole!
                                    if (postVersion.contentMap) {
                                        result.contentMap = postVersion.contentMap
                                    }
                                    break
                                case 'delete':
                                    Object.assign(result, {revoked: true})
                            }
                        } else {
                            console.error('Counterfeit proof in the post history', postVersion, versionProof, postAggregated.origin)
                        }
                    }
                }
                postAggregated.result = result
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
                    //latest: plainPost,
                    result: plainPost,
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
                //latest: minimalPost,
                result: minimalPost,
                my: false,
                to: post.to,
                encrypted: 'unknown'
            }
        }
        postsAggregated.sort(((a, b) => new Date(a.origin.timestamp) - new Date(b.origin.timestamp))) //ascending

        if (postAggregated.encrypted && postAggregated.encrypted !== 'unknown') {
            if (!plainPost.conversationId) { //this is the second post (first reply) in the conversation
                const oPost = postsAggregated.find(pa => pa.pid === post.to[0].pid)
                // TODO:  this must be changed if the multiperson conversation will be implemented
                // possibly to an array of oPosts?
                const conversation = {
                    id: `/${oPost.pid}/direct/${post.pid}`,
                    firstPid: oPost.pid,
                    secondPid: postAggregated.pid,
                    posts: [oPost, postAggregated],
                    latest: postAggregated.result.timestamp,
                    fresh: postAggregated.encrypted === 'their'
                }
                if (!conversations.find(c => c.id === conversation.id)) {
                    conversations.push(conversation)
                }
            } else {
                const conversation = conversations.find(c => c.id === plainPost.conversationId)
                if (!conversation) {
                    //possibly error
                    const [_, first, __, second] = plainPost.conversationId.split('/')
                    conversation = {id: plainPost.conversationId, posts: [], latest: 0, fresh: true, firstPid, secondPid, headless: true}
                    console.log('Headless conversation', conversation)
                    conversations.push(conversation)
                }
                if (!conversation.posts.includes(postAggregated)) {
                    conversation.posts.push(postAggregated)
                    conversation.posts.sort(((a, b) => new Date(a.origin.timestamp) - new Date(b.origin.timestamp)))
                    conversation.latest = conversation.posts[conversation.posts.length - 1].result.timestamp // NB
                    conversation.fresh = postAggregated.encrypted === 'their'
                }
            }
        }
        conversations.sort(((a, b) => new Date(b.latest) - new Date(a.latest))) // descending

        return postAggregated
    }
    posts.forEach(post => aggregate(post))
    // TODO: move to a separate module -------------------------------------------------------------

    const messagesProcessed = new Set()

    const generatePId = () => `${pr.id.toString('hex')}:${new Date().toISOString()}`

    let stateChangeHandler = () => {} // TODO: replace with messages
    const onStateChange = handler => stateChangeHandler = handler

    // --- REPLIES ---


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
        broadcast({type: 'put post', post})
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
        broadcast({type: 'put post', post})
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
            return encryptedPost.pid
        } else {
            if (post.body) {
                contentStore.set(post.body.cid, {type: 'text/plain', text: body, cid: post.body.cid}) // todo: regularize with files?
            }

            filesFull.forEach(file => {
                contentStore.set(file.cid, file)
            })

            putPostToStore(post)
            broadcast({type: 'put post', post})
            return post.pid
        }
    }

    // --- GETTERS ---


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
        messagesProcessed,
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
        microjson,
        crypto
    })



    addHandlers({
        pr,
        peers,
        posts,
        getStateChangeHandler: () => stateChangeHandler,
        getPostInitialized: () => postInitialized,
        setPostInitialized: (value) => { postInitialized = value },
        storePost,
        messagesProcessed,
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
