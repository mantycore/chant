// @flow
import type { Message, MessageWithId } from 'Mantra/.flow/'
import log from 'Common/log.js'

const send = (
    id: any,
    message: Message | MessageWithId,
    binary: boolean = false,
    pr: any
) => {
    const newMessage = Object.assign({}, message)
    let mid: string

    if (typeof message.mid === 'string') {
        mid = message.mid
    } else {
        mid = new Date().toISOString()
        Object.assign(((newMessage: any): MessageWithId), {mid})
        // I do not want to create a new object, so
        // I need to unstafely cast Message to MessageWithId
    }
    if (message.type !== 'ping' && message.type !== 'pong') {
        log.info("SEND", id.toString('hex', 0, 2), message)
    }
    pr.send(id, newMessage, binary)
    return mid
}

export default send
