import bs58 from 'bs58'
import nacl from 'tweetnacl'
import base64 from 'base64-js'
import { Buffer } from 'buffer'

import crypto from 'Common/crypto.js'
import toCID from 'Common/cid.js'

import broadcast from 'Mantra/broadcast.js'
import { putContents } from 'Mantra/request/put/'

import createPost from 'Psalm/createPost.js'
import processFiles from 'Psalm/processFiles.js'
import inner from 'Psalm/inner.js'
import { asBufferPlain } from 'Psalm/asBuffer.js'

const revoke = async (state, subscriber, origin) => {
    const psalm = await createPost({
        nid: state.init.pr.id,
        proofs: [{type: 'delete', post: origin}]
    })
    //putPostToStore(psalm)
    subscriber.next({type: 'prakriti poema put', poema: psalm})
    broadcast({type: 'req poema put', payload: psalm}, false, state.mantra.peers, state.init.pr)
}

const updatePost = async (state, subscriber, update, origin, mode) => {
    let psalm;

    let proofs = []
    if (update.body) {
        const signaturesMarkup = update.body.match(/~[a-zA-Z0-9]{64,88}/g)
        if (signaturesMarkup) {
            proofs = signaturesMarkup
                .map(s => s.substring(1))
                .map(pid => state.poema.poemata.find(poema => poema.pid === pid))
                .map(poema => ({type: 'hand', post: poema}))
        }
    }

    if (mode === 'patch') {
        psalm = await createPost({
            nid: state.init.pr.id,
            ...update,
            proofs: [{type: 'patch', post: origin}].concat(proofs)
        })
    } else if (mode === 'put') { // unfinished and untested, written just in case
        const params = {
            nid: state.init.pr.id,
            ...(Object.assign(update, inner(origin)))
        }
        params.proofs = (params.proofs || []).concat(proofs)
        params.proofs.push({type: 'put', post: origin})
        psalm = await createPost(/*...*/)
    }
    //putPostToStore(psalm)
    subscriber.next({type: 'prakriti poema put', poema: psalm})
    broadcast({type: 'req poema put', payload: psalm}, false, state.mantra.peers, state.init.pr)
}

const putPost = async(state, subscriber, post) => {
    const {body, filesToLoad, opid, tags, to, conversationId} = post

    if (!filesToLoad && body.match(/^\s+$/)) {
       return
    }
    const [filesFull, attachments] = await processFiles(filesToLoad)

    let proofs = null
    const signaturesMarkup = body.match(/~[a-zA-Z0-9]{64,88}/g)
    if (signaturesMarkup) {
        proofs = signaturesMarkup
            .map(s => s.substring(1))
            .map(pid => state.poema.poemata.find(poema => poema.pid === pid))
            .filter(poema => poema) //filter out nonexistent
            .map(poema => ({type: 'hand', post: poema}))
    }

    const psalm = await createPost({
        body,
        attachments,
        nid: state.init.pr.id,
        opid,
        tags,
        proofs,
        conversationId
    })

    let poema

    if (to) {
        const nonce = bs58.decode(psalm.pid).slice(0, 24)
        const toPost = state.surah.suwar.find(curSurah => curSurah.pid === to)
        const recipientDirectKey = bs58.decode(toPost.origin.directKey)
        const secretKey = crypto.direct.secretKey(recipientDirectKey, nonce)

        const contentMap = {}
        const contentsToBroadcast = []

        if (psalm.body) {
            const encryptedBody = nacl.secretbox(Buffer.from(body), nonce, secretKey.itself)
            const cid = await toCID(encryptedBody)
            const buffer = Buffer.from(body)
            const encryptedPayload = {type: 'application/octet-stream', buffer: encryptedBody, cid, size: encryptedBody.length, name: cid}
            subscriber.next({type: 'prakriti content put', cid, payload: encryptedPayload, status: {replicated: 0, persisted: 0, source: 'maya'}})
            const payload = {type: 'text/plain', buffer, cid: psalm.body.cid, size: buffer.length}
            subscriber.next({type: 'prakriti content put', cid: psalm.body.cid, payload, status: {private: true, source: 'maya'}})
            contentMap[psalm.body.cid] = cid
            contentsToBroadcast.push(payload)
        }

        for (const file of filesFull) {
            //{buffer: buffers[i], cid: cids[i], type: file.type, name: file.name, size: file.size}
            const encryptedAttachment = nacl.secretbox(file.buffer, nonce, secretKey.itself)
            const cid = await toCID(encryptedAttachment)
            const encryptedPayload = {type: 'application/octet-stream', buffer: encryptedAttachment, cid, size: encryptedAttachment.length, name: cid}
            subscriber.next({type: 'prakriti content put', cid, payload: encryptedPayload, status: {replicated: 0, persisted: 0, source: 'maya'}})
            subscriber.next({type: 'prakriti content put', cid: file.cid, payload: file, status: {private: true, source: 'maya'}})
            contentMap[file.cid] = cid
            contentsToBroadcast.push(encryptedPayload)
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
        poema = haiku
        await putContents(subscriber, contentsToBroadcast, state.mantra.peers, state.init.pr)
    } else {
        if (psalm.body) {
            const buffer = Buffer.from(body) //TODO: support both plain and markdown text
            subscriber.next({type: 'prakriti content put', cid: psalm.body.cid, payload: {type: 'text/markdown', buffer, cid: psalm.body.cid, size: buffer.length, name: 'index.md'}, status: {replicated: 0, persisted: 0, source: 'maya'}})
        }

        filesFull.forEach(file => {
            subscriber.next({type: 'prakriti content put', cid: file.cid, payload: file, status: {replicated: 0, persisted: 0, source: 'maya'}})
        })

        poema = psalm
        await putContents(subscriber, filesFull, state.mantra.peers, state.init.pr)
    }

    //putPostToStore(psalm)
    subscriber.next({type: 'prakriti poema put', poema, status: {source: 'maya'}})
    broadcast({type: 'req poema put', payload: poema}, false, state.mantra.peers, state.init.pr)
    //TODO: await for reply, display replication count
    return poema.pid
}

export {
    revoke,
    updatePost,
    putPost
}
