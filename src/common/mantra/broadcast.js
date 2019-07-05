// @flow
import send from './send.js'

const broadcast = (message, binary = false, /* add */ peers, pr) => {
    const newMessage = Object.assign({}, message)
    let mid // TODO: think about better solution
    for (const peer of peers.values()) {
        // TODO: add already processed nodes
        if (!message.origin || !(peer.equals(message.origin))) {
            mid = send(peer, newMessage, binary, pr)
            Object.assign(newMessage, {mid})
        }
    }
    return mid
}

export default broadcast
