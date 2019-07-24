import send from './send.js'

const broadcast = (mantra, binary = false, /* add */ peers, pr) => {
    const newMantra = Object.assign({}, mantra)
    let mid // TODO: think about better solution
    for (const peer of peers.values()) {
        // TODO: add already processed nodes
        if (!mantra.origin || !(peer.nid.equals(mantra.origin))) {
            mid = send(peer.nid, newMantra, binary, pr)
            Object.assign(newMantra, {mid})
        }
    }
    return mid
}

export default broadcast
