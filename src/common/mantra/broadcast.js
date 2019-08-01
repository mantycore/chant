import send from './send.js'

const broadcast = (mantra, binary = false, /* add */ peers, pr) => {
    const newMantra = Object.assign({}, mantra)
    let mid // TODO: think about better solution

    let plainPeers
    if (Array.isArray(peers)) { //compat
        plainPeers = peers
    } else if (peers instanceof Map) {
        plainPeers = peers.values()
    } else {
        plainPeers = Object.values(peers)
    }
    for (const peer of plainPeers) {
        // TODO: add already processed nodes
        if (!mantra.origin || !(peer.nid.equals(mantra.origin))) {
            mid = send(peer.nid, newMantra, binary, pr)
            Object.assign(newMantra, {mid})
        }
    }
    return mid
}

export default broadcast
