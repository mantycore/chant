import send from 'Mantra/send.js'
import { waitForReply } from 'Mantra/reply.js'

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

export {
    getContent,
    ping,
    getPosts
}
