import bs58 from 'bs58'
import crypto from 'Common/crypto.js'
import asBuffer from 'Psalm/asBuffer.js'

const verify = (psalm, ayah, originalPsalm) => crypto.proof.verify(
    asBuffer(psalm),
    bs58.decode(ayah.signature),
    asBuffer(originalPsalm),
    bs58.decode(originalPsalm.proofSignature),
    bs58.decode(originalPsalm.proofKey))

export default verify
