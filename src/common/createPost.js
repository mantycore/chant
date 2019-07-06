import { Buffer } from 'buffer'
import BSON from 'bson'
import crypto from './crypto.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import toCID from './cid.js'
import microjson from './microjson.js'

const PROTOCOL_VERSION = 0

const inner = post => {
    const innerPost = {...post}
    delete innerPost.pid
    delete innerPost.proofs
    delete innerPost.proofKey
    delete innerPost.proofSignature
    delete innerPost.directKey
    delete innerPost.contentMap
    return innerPost
}

const createPost = async ({body, attachments, nid, opid, tags, proofs, conversationId}) => {
    const timestamp = new Date().getTime() // millisecond from epoch

    const post = {
        timestamp,
        //links
        version: PROTOCOL_VERSION
    }
    if (body) {
        const cid = await toCID(body)
        Object.assign(post, {body: {cid: await toCID(body), text: body}})
    }
    if (opid) {
        Object.assign(post, {opid})
    }
    if (tags) {
        Object.assign(post, {tags})
    }
    if (conversationId) {
        Object.assign(post, {conversationId})
    }
    if (attachments && attachments.length > 0) {
        Object.assign(post, {attachments})
    }

    /*------------------------
       inner post is complete
      ------------------------*/
    const bsonPost = Buffer.from(microjson(post)) // is it good enough?
    const pid = bs58.encode(nacl.hash(Buffer.from(microjson(({post, nid})))))
    const [proofKey, proofSignature] = crypto.proof.signOrigin(bsonPost).map(Buffer.from).map(bs58.encode)
    const directKey = bs58.encode(Buffer.from(crypto.direct.signOrigin(bsonPost)))

    if (proofs) {
        Object.assign(post, {proofs: proofs.map(proof => {
            const result = ({
                signature: bs58.encode(Buffer.from(crypto.proof.signDerived(
                    bsonPost, Buffer.from(microjson(inner(proof.post))) ))),
                type: proof.type,
                pid: proof.post.pid
            })
            const verification = crypto.proof.verify(
                bsonPost,
                bs58.decode(result.signature),
                Buffer.from(microjson(inner(proof.post))),
                bs58.decode(proof.post.proofSignature),
                bs58.decode(proof.post.proofKey)
            )
            // TODO: warn if the signature is invalid
            return result
        }
        )})
    }

    Object.assign(post, {
        pid,
        proofKey,
        proofSignature,
        directKey
        //proofs
    })

    return post
}

const processFiles = async(filesToLoad) => {
    const pFileReader = method => file => new Promise((resolve, reject) => {
        const fileReader = new FileReader()
        fileReader.onload = resolve
        fileReader[method](file)
    })

    let attachments = []
    let filesFull = []
    if (filesToLoad) {
        const arrayBufferReaders = await Promise.all(Array.from(filesToLoad).map(pFileReader('readAsArrayBuffer')))
        const arrayBuffers = arrayBufferReaders.map(event => event.target.result)  // change to Buffers, check if the result is the same
        const cids = await Promise.all(arrayBuffers.map(toCID))

        //const dataURLReaders = await Promise.all(Array.from(filesToLoad).map(pFileReader('readAsDataURL')))
        //const dataURLs = dataURLReaders.map(event => event.target.result)

        //filesFull = Array.from(filesToLoad).map((file, i) => ({dataURL: dataURLs[i], cid: cids[i], type: file.type, name: file.name, size: file.size})) // size, lastModified
       
        const buffers = arrayBuffers.map(arrayBuffer => Buffer.from(arrayBuffer))
            filesFull = Array.from(filesToLoad).map((file, i) => ({buffer: buffers[i], cid: cids[i], type: file.type, name: file.name, size: file.size})) // size, lastModified
       
        attachments = Array.from(filesToLoad).map((file, i) => ({cid: cids[i], type: file.type, name: file.name, size: file.size})) // size, lastModified
    }
    return [filesFull, attachments]
}

export {processFiles, createPost, inner}
