import send from 'Mantra/send.js'
import { waitForReply } from 'Mantra/reply.js'

const getContent = async (cid, peers, pr) => new Promise((resolve, reject) => {
    const mid = send(Array.from(peers)[0], {type: 'req content get', cid}, false, pr)
    //NB! only one reply is handled. Needs fixing
    waitForReply(mid, resolve, reject, 10000)
})

const ping = async (peer, pr) => new Promise((resolve, reject) => {
    const mid = send(peer, {type: 'ping'}, false, pr)
    waitForReply(mid, resolve, reject)
})

const getPosts = async (peer, pr) => new Promise((resolve, reject) => {
    const mid = send(peer, {type: 'req poemata get'}, false, pr)
    waitForReply(mid, resolve, reject)
})

export {
    getContent,
    ping,
    getPosts
}
