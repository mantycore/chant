import bs58 from 'bs58'
import base64 from 'base64-js'
import crypto from 'Common/crypto.js'
import nacl from 'tweetnacl'
import asBuffer from 'Psalm/asBuffer.js'

// haiku

const decrypt = (
    haiku,
    suwar,
    contentStore,
    getStateChangeHandler,
    getAndStoreContent
) => {
    let psalm, directSide

    const nonce = bs58.decode(haiku.pid).slice(0, 24)
    const ciphertext = base64.toByteArray(haiku.ciphertext)
    let secretKey = crypto.direct.decryptKeyAsSender(base64.toByteArray(haiku.senderKey), nonce)
    const my = secretKey !== null
    if (my) {
        psalm = JSON.parse(Buffer.from(
            nacl.secretbox.open(ciphertext, nonce, secretKey)
        ).toString())
        directSide = 'my'
    } else {
        let origin;
        let encryptedKey;
        haiku.to.forEach(recipient => {
            const originCandidate = suwar.find(curSurah => curSurah.pid === recipient.pid)
            if (originCandidate && originCandidate.my) {
                origin = originCandidate
                encryptedKey = base64.toByteArray(recipient.key)
            }
        })
        if (origin) {
            secretKey = crypto.direct.decryptKeyAsRecipient(encryptedKey, asBuffer(origin.origin))
            psalm = JSON.parse(Buffer.from(
                nacl.secretbox.open(ciphertext, nonce, secretKey)
            ).toString())
            directSide = 'their'
        } else {
            psalm = null
            directSide = 'unknown'
        }
    }

    // Encrypted content
    // TODO: move to another file under surah?
    if (directSide !== 'unknown') {
        Object.entries(psalm.contentMap).forEach(([cidPlain, cidEncrypted]) => {
            if (!contentStore.has(cidPlain)) {
                getAndStoreContent(cidEncrypted).then(result => {
                    const {cid, attachment} = result
                    const contents = [
                        ...(psalm.body ? [psalm.body] : []),
                        ...(psalm.attachments ? psalm.attachments : [])
                    ]
                    const content = contents.find(c => c.cid === cidPlain)
                    const decryptedAttachment = Buffer.from(nacl.secretbox.open(attachment.buffer, nonce, secretKey))
                    contentStore.set(cidPlain, {payload: {...content, buffer: decryptedAttachment}})
                    getStateChangeHandler()('put attachment', {cid: cidPlain, attachment: {...content, buffer: decryptedAttachment}, private: true})
                })
            }
        })
    }

    return {psalm, directSide}
}

export default decrypt
