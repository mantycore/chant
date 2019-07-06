import { Buffer } from 'buffer'
import BSON from 'bson'
import crypto from 'Common/crypto.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import toCID from 'Common/cid.js'
import asBuffer, { asBufferPlain } from './asBuffer.js'

const PROTOCOL_VERSION = 0

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
    const bsonPost = asBufferPlain(post)// is it good enough?
    const pid = bs58.encode(nacl.hash(asBufferPlain({post, nid})))
    const [proofKey, proofSignature] = crypto.proof.signOrigin(bsonPost).map(Buffer.from).map(bs58.encode)
    const directKey = bs58.encode(Buffer.from(crypto.direct.signOrigin(bsonPost)))

    if (proofs) {
        Object.assign(post, {proofs: proofs.map(proof => {
            const result = ({
                signature: bs58.encode(Buffer.from(crypto.proof.signDerived(
                    bsonPost, asBuffer(proof.post) ))),
                type: proof.type,
                pid: proof.post.pid
            })
            const verification = crypto.proof.verify(
                bsonPost,
                bs58.decode(result.signature),
                asBuffer(proof.post),
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

export default createPost
