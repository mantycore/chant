import log from 'Common/log.js'

const send = (id, message, binary = false, pr) => {
    const newMessage = Object.assign({}, message)
    let mid
    if (message.mid) {
        mid = message.mid
    } else {
        mid = new Date().toISOString()
        Object.assign(newMessage, {mid})
    }
    if (message.type !== 'ping' && message.type !== 'pong') {
        log.info("SEND", id.toString('hex', 0, 2), message)
    }
    pr.send(id, newMessage, binary)
    return mid
}

export default send
