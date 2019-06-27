const encoder = new TextEncoder("utf-8")
const encode = encoder.encode.bind(encoder)
const decoder = new TextDecoder("utf-8")
const decode = decoder.decode.bind(decoder)

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

const passphrase = encode("Owls are not that they seem")
const salt = nacl.randomBytes(24)
const saltMessage = message => nacl.hash(concat([passphrase, salt, message])).slice(0, 32)

const messageToSignPair = message => nacl.sign.keyPair.fromSeed(saltMessage(message))
const messageToBoxPair = message => nacl.box.keyPair.fromSecretKey(saltMessage(message))
const hashTogether = (sender, recipient) => nacl.hash(concat([sender, recipient])).slice(0, 24)

const crypto = {
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

        encrypt: (message, recipientPublicKey) => {
            const senderSecretKey = nacl.randomBytes(32)
            const senderPublicKey = nacl.box.keyPair.fromSecretKey(senderSecretKey).publicKey
            return concat([
                senderPublicKey,
                nacl.box(
                    message,
                    hashTogether(senderPublicKey, recipientPublicKey),
                    recipientPublicKey,
                    senderSecretKey
                )]);
        },

        decrypt: (ciphertext, originalMessage) => {
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
