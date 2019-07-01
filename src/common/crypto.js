import nacl from 'tweetnacl'
import BSON from 'bson'

const concat = args => {
    const len = args.reduce((acc, cur) => acc + cur.byteLength, 0)
    const result = new Uint8Array(len)
    let offset = 0
    args.forEach(arg => {
        result.set(arg, offset)
        offset += arg.byteLength
    })
    return result
}
//let passphrase = BSON.serialize("Owls are not that they seem")
let passphrase = nacl.randomBytes(512)
const salt = new Uint8Array([
    195, 43, 34, 160, 25, 196,
    174, 125, 48, 181, 174, 196,
    32, 70, 187, 210, 82, 61,
    131, 89, 228, 119, 150, 55])
const saltMessage = message => nacl.hash(concat([passphrase, salt, message])).slice(0, 32)
const hashedPassphrase = () => nacl.hash(concat([passphrase, salt])).slice(0, 32)
const messageToSignPair = message => nacl.sign.keyPair.fromSeed(saltMessage(message))
const messageToBoxPair = message => nacl.box.keyPair.fromSecretKey(saltMessage(message))
const hashTogether = (sender, recipient) => nacl.hash(concat([sender, recipient])).slice(0, 24)

const encryptWithAnEphemeralSenderKey = (message, recipientPublicKey) => {
    const senderSecretKey = nacl.randomBytes(32)
    const senderPublicKey = nacl.box.keyPair.fromSecretKey(senderSecretKey).publicKey
    return concat([
        senderPublicKey,
        nacl.box(
            message,
            hashTogether(senderPublicKey, recipientPublicKey),
            recipientPublicKey,
            senderSecretKey
        )
    ]);
}

const crypto = {
    setPassphrase: newPassphrase => { passphrase = newPassphrase },
    proof: {
        signOrigin: message => {
            const keyPair = messageToSignPair(message)
            const publicKey = keyPair.publicKey
            const signature = nacl.sign.detached(message, keyPair.secretKey)
            return [publicKey, signature] // todo: concat
        },

        signDerived: (message2, message1) => 
            nacl.sign.detached(message2, messageToSignPair(message1).secretKey),

        verify: (message2, signature2, message1, signature1, publicKey) =>
            nacl.sign.detached.verify(message2, signature2, publicKey) &&
            nacl.sign.detached.verify(message1, signature1, publicKey),
    },
    direct: {
        signOrigin: message => messageToBoxPair(message).publicKey,

        secretKey: (recipientPublicKey, nonce) => {
            const secretKey = nacl.randomBytes(32)
            const encryptedForSender = nacl.secretbox(secretKey, nonce, hashedPassphrase())
            const encryptedForRecipient = encryptWithAnEphemeralSenderKey(secretKey, recipientPublicKey)
            return {
                itself: secretKey,
                encryptedForSender,
                encryptedForRecipient
            }
        },

        decryptKeyAsSender: (encryptedForSender, nonce) => 
            nacl.secretbox.open(encryptedForSender, nonce, hashedPassphrase()),

        decryptKeyAsRecipient: (ciphertext, originalMessage) => {
            const senderPublicKey = ciphertext.slice(0, 32)
            const box = ciphertext.slice(32)
            return nacl.box.open(
                box,
                hashTogether(senderPublicKey, messageToBoxPair(originalMessage).publicKey), //or may pass the local public key explicitly
                senderPublicKey,
                saltMessage(originalMessage)
            )
        }
    }
}

export default crypto
