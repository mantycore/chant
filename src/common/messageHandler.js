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

    let writeAttachment = () => {}
    if (isServerNode) {
        writeAttachment = state.writeAttachment //TODO: improve
    }

    let stateChangeHandler = () => {} // TODO: replace with messages
    const onStateChange = handler => stateChangeHandler = handler
    // --- THINGS THAT USE GETTERS ---
    const getAndStoreContent = async cid => {
        try {
            const attachment = await getContent(cid, peers, pr) // mantra/request
            const storageAttachment = {...attachment, buffer: attachment.buffer} //BSON: buffer(Binary).buffer; msgpack: just buffer
            contentStore.set(cid, storageAttachment) //TODO: on server, store only metadata in the contentStore, and load buffer only on request
            if (isServerNode) {
                await writeAttachment(storageAttachment)
            }
            stateChangeHandler('put attachment', {cid, attachment: storageAttachment})
            return {cid, attachment: storageAttachment}
        } catch (e) {
            console.log("Exception durig getting content file #", cid, e)
            throw e
        }
    }
    // TODO: move to a separate module -------------------------------------------------------------
    const poemata = state.poemata || [] //could also contain haikus 
    const suwar = []
    const rengashu = []

    poemata.forEach(poema => aggregate(
        poema,
        suwar, // modified as a result
        contentStore, // modified as a result
        () => stateChangeHandler, // called as a result
        rengashu, // modified as a result
        getAndStoreContent,
        poemata
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

    const putPostToStore = poema => {
        if (poema.opid === null) {
            delete poema.opid // hacky, improve
        }
        poemata.push(poema)
        const surah = aggregate(
            poema,
            suwar, // modified as a result
            contentStore, // modified as a result
            () => stateChangeHandler, // called as a result
            rengashu, // modified as a result
            getAndStoreContent,
            poemata
        )
        stateChangeHandler('put post', {poema, surah})
    }

    const revoke = async origin => {
        const psalm = await createPost({
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
        putPostToStore(psalm)
        broadcast({type: 'put post', post: psalm}, false, peers, pr)
    }

    const updatePost = async (update, origin, mode) => {
        let psalm;

        let proofs = []
        if (update.body) {
            const signaturesMarkup = update.body.match(/~[a-zA-Z0-9]{64,88}/g)
            if (signaturesMarkup) {
                proofs = signaturesMarkup
                    .map(s => s.substring(1))
                    .map(pid => poemata.find(poema => poema.pid === pid))
                    .map(poema => ({type: 'hand', post: poema}))
            }
        }

        if (mode === 'patch') {
            psalm = await createPost({
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
            psalm = await createPost(/*...*/)
        }
        putPostToStore(psalm)
        broadcast({type: 'put post', post: psalm}, false, peers, pr)
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
                .map(pid => poemata.find(poema => poema.pid === pid))
                .map(poema => ({type: 'hand', post: poema}))
        }

        const psalm = await createPost({
            body,
            attachments,
            nid: pr.id,
            opid,
            tags,
            proofs,
            conversationId
        })

        if (to) {
            const nonce = bs58.decode(psalm.pid).slice(0, 24)
            const toPost = suwar.find(curSurah => curSurah.pid === to)
            const recipientDirectKey = bs58.decode(toPost.origin.directKey)
            const secretKey = crypto.direct.secretKey(recipientDirectKey, nonce)

            const contentMap = {}

            if (psalm.body) {
                const encryptedBody = nacl.secretbox(Buffer.from(body), nonce, secretKey.itself)
                const cid = await toCID(encryptedBody)
                contentStore.set(cid, {type: 'application/octet-stream', buffer: encryptedBody, cid})
                contentStore.set(psalm.body.cid, {type: 'text/plain', text: body, cid: psalm.body.cid, private: true}) // todo: regularize with files?
                contentMap[psalm.body.cid] = cid
            }

            for (const file of filesFull) {
                //{buffer: buffers[i], cid: cids[i], type: file.type, name: file.name, size: file.size}
                const encryptedAttachment = nacl.secretbox(file.buffer, nonce, secretKey.itself)
                const cid = await toCID(encryptedAttachment)
                contentStore.set(cid, {type: 'application/octet-stream', buffer: encryptedAttachment, cid, size: encryptedAttachment.length})
                contentStore.set(file.cid, {...file, private: true})
                contentMap[file.cid] = cid
            }

            Object.assign(psalm, {contentMap}) // counts as a part of outer post

            const ciphertext = nacl.secretbox(asBufferPlain(psalm), nonce, secretKey.itself) //BSON instead of Buffer.from(microjson(post)?

            const haiku = {
                ciphertext: base64.fromByteArray(ciphertext),
                to: [{
                    pid: to,
                    key: base64.fromByteArray(secretKey.encryptedForRecipient)
                }],
                senderKey: base64.fromByteArray(secretKey.encryptedForSender),
                timestamp: psalm.timestamp,
                pid: psalm.pid,
                version: psalm.version
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
            putPostToStore(haiku)
            broadcast({type: 'put post', post: haiku}, false, peers, pr)
            return haiku.pid
        } else {
            if (psalm.body) {
                contentStore.set(psalm.body.cid, {type: 'text/plain', text: body, cid: psalm.body.cid}) // todo: regularize with files?
            }

            filesFull.forEach(file => {
                contentStore.set(file.cid, file)
            })

            putPostToStore(psalm)
            broadcast({type: 'put post', post: psalm}, false, peers, pr)
            return psalm.pid
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

    const storePost = poema => {
        putPostToStore(poema) //TODO: simplify calls and naming scheme

        if (isServerNode) {
            if (poema.attachments) {
                poema.attachments.map(async attachment => {
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
        poemata,
        suwar,
        // messagesProcessed, // mantra/ internal
        rengashu,

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
        poemata,
        getStateChangeHandler: () => stateChangeHandler,
        storePost,
        contentStore,
        isServerNode
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
