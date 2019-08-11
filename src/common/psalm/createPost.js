// @flow
import type { InnerPsalm, Psalm, ContentPayload } from './.flow/index.js'

import { Buffer } from 'buffer'
import crypto from 'Common/crypto.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import toCID from 'Common/cid.js'
import asBuffer, { asBufferPlain } from './asBuffer.js'

import PROTOCOL_VERSION from 'Common/version.js'

const createPost = async ({body, attachments, nid, opid, tags, proofs, conversationId}: {
    body: ?string,
    attachments: ?ContentPayload[],
    nid: any, /*TODO: FIX FLOW*/
    opid: string,
    tags: ?string[],
    proofs: any, /*TODO: FIX FLOW*/
    conversationId: ?string
}): Promise<Psalm> => {
    const timestamp: number = new Date().getTime() // millisecond from epoch

    const innerPsalm: InnerPsalm = {
        timestamp,
        //links
        version: PROTOCOL_VERSION
    }

    if (body) {
        const cid = await toCID(body)
        Object.assign(innerPsalm, {body: {cid: await toCID(body), text: body}})
    }
    if (opid) {
        Object.assign(innerPsalm, {opid})
    }
    if (tags) {
        Object.assign(innerPsalm, {tags})
    }
    if (conversationId) {
        Object.assign(innerPsalm, {conversationId})
    }
    if (attachments && attachments.length > 0) {
        Object.assign(innerPsalm, {attachments})
    }

    /*------------------------
       inner post is complete
      ------------------------*/

    const binaryPsalm = asBufferPlain(innerPsalm)// is it good enough?
    const pid: string = bs58.encode(nacl.hash(asBufferPlain({innerPsalm, nid})))
    const [proofKey, proofSignature]: [string, string] = crypto.proof.signOrigin(binaryPsalm).map(Buffer.from).map(bs58.encode)
    const directKey: string = bs58.encode(Buffer.from(crypto.direct.signOrigin(binaryPsalm)))

    const psalm: Psalm = Object.assign({}, innerPsalm, {
        pid,
        proofKey,
        proofSignature,
        directKey
        //proofs
    });

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


    return psalm
}

export default createPost
