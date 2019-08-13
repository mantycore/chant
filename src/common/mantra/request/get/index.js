import send from 'Mantra/send.js'
import broadcast from 'Mantra/broadcast.js'
import { waitForReply, waitForReplies } from 'Mantra/reply.js'
import { Observable } from 'rxjs'

const getContent = async (cid, nid, pr) => new Promise((resolve, reject) => {
    const mantra = {type: 'req content get', params: {cid}}
    const mid = send(nid, mantra, false, pr)
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

const getPoemata = (params, peers, pr) => {
    const persistingPeers = Object.values(peers).filter(peer => peer.persistent)
    console.log("persistingPeers:", persistingPeers)
    const mantra = {type: 'req poemata get', ...(params ? {params} : {})}
    const mid = broadcast(mantra, false, persistingPeers, pr)

    return new Observable(observer => waitForReplies(mid, mantra, persistingPeers.map(peer => peer.nid), observer))
}

export {
    getContent,
    ping,
    getPosts,
    getPoemata
}
