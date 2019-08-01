import { Buffer } from 'buffer'
import crypto from 'Common/crypto.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import toCID from 'Common/cid.js'
import asBuffer, { asBufferPlain } from './asBuffer.js'

import PROTOCOL_VERSION from 'Common/version.js'

const createPost = async ({body, attachments, nid, opid, tags, proofs, conversationId}) => {
    const timestamp = new Date().getTime() // millisecond from epoch

    const psalm = {
        timestamp,
        //links
        version: PROTOCOL_VERSION
    }
    if (body) {
        const cid = await toCID(body)
        Object.assign(psalm, {body: {cid: await toCID(body), text: body}})
    }
    if (opid) {
        Object.assign(psalm, {opid})
    }
    if (tags) {
        Object.assign(psalm, {tags})
    }
    if (conversationId) {
        Object.assign(psalm, {conversationId})
    }
    if (attachments && attachments.length > 0) {
        Object.assign(psalm, {attachments})
    }

    /*------------------------
       inner post is complete
      ------------------------*/
    const binaryPsalm = asBufferPlain(psalm)// is it good enough?
    const pid = bs58.encode(nacl.hash(asBufferPlain({psalm, nid})))
    const [proofKey, proofSignature] = crypto.proof.signOrigin(binaryPsalm).map(Buffer.from).map(bs58.encode)
    const directKey = bs58.encode(Buffer.from(crypto.direct.signOrigin(binaryPsalm)))

    if (proofs) {
        Object.assign(psalm, {proofs: proofs.map(proof => {
            const result = ({
                signature: bs58.encode(Buffer.from(crypto.proof.signDerived(
                    binaryPsalm, asBuffer(proof.post) ))),
                type: proof.type,
                pid: proof.post.pid
            })
            const verification = crypto.proof.verify(
                binaryPsalm,
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

    Object.assign(psalm, {
        pid,
        proofKey,
        proofSignature,
        directKey
        //proofs
    })

    return psalm
}

export default createPost
