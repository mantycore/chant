import bs58 from 'bs58'
import crypto from 'Common/crypto.js'
import asBuffer from 'Psalm/asBuffer.js'

const verify = (post, proof, original) => crypto.proof.verify(
    asBuffer(post),
    bs58.decode(proof.signature),
    asBuffer(original),
    bs58.decode(original.proofSignature),
    bs58.decode(original.proofKey))

export default verify
