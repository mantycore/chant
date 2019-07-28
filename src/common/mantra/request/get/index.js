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

    const mid = send(plainPeers[0].nid, {type: 'req content get', params: {cid}}, false, pr)
    //NB! only one reply is handled. Needs fixing
    waitForReply(mid, resolve, reject, 10000)
})

const ping = async (payload, nid, pr) => new Promise((resolve, reject) => {
    const mid = send(nid, {type: 'ping', ...(payload ? {payload} : {})}, false, pr)
    waitForReply(mid, resolve, reject)
})

const getPosts = async (nid, pr) => new Promise((resolve, reject) => {
    const mid = send(nid, {type: 'req poemata get'}, false, pr)
    waitForReply(mid, resolve, reject)
})

export {
    getContent,
    ping,
    getPosts
}
