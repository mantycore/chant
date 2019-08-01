import send from 'Mantra/send.js'
import { waitForReply } from 'Mantra/reply.js'

const getContent = async (cid, peers, pr) => new Promise((resolve, reject) => {
    let plainPeers
    if (Array.isArray(peers)) { //compat
        plainPeers = peers
    } else if (peers instanceof Map) {
        plainPeers = peers.values()
    } else {
        plainPeers = Object.values(peers)
    }

    const mantra = {type: 'req content get', params: {cid}}
    const mid = send(plainPeers[0].nid, mantra, false, pr)
    //NB! only one reply is handled. Needs fixing
    waitForReply(mid, mantra, resolve, reject, 10000)
})

const ping = async (payload, nid, pr) => new Promise((resolve, reject) => {
    const mantra = {type: 'ping', ...(payload ? {payload} : {})}
    const mid = send(nid, mantra, false, pr)
    waitForReply(mid, mantra, resolve, reject)
})

const getPosts = async (nid, pr) => new Promise((resolve, reject) => {
    const mantra = {type: 'req poemata get'}
    const mid = send(nid, mantra, false, pr)
    waitForReply(mid, mantra, resolve, reject)
})

export {
    getContent,
    ping,
    getPosts
}
