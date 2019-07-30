import broadcast from 'Mantra/broadcast.js'
import { waitForReplies } from 'Mantra/reply.js'
import { Observable, combineLatest } from 'rxjs'
import { first, timeout, share } from 'rxjs/operators'

const putContent = (payload, peers, pr) => {
    let plainPeers
    if (Array.isArray(peers)) { //compat
        plainPeers = peers
    } else if (peers instanceof Map) {
        plainPeers = peers.values()
    } else {
        plainPeers = Object.values(peers)
    }

    const persistingPeers = plainPeers.filter(peer => peer.persistent)
    const mantra = {type: 'req content put', ...(payload ? {payload} : {})}
    const mid = broadcast(mantra, true, persistingPeers, pr)

    return new Observable(observer => waitForReplies(mid, mantra, persistingPeers.map(peer => peer.nid.toString('hex')), observer))
}

const putContents = async (subscriber, contents, peers, pr) => {
    const contentsWithReplies = contents.map(payload => ({payload, reply$: putContent(payload, peers, pr).pipe(share())}))

    contentsWithReplies.forEach(({payload, reply$}) => reply$.subscribe(reply => {
        //TODO: do it better, maybe have a Map of nodes that replicated this content
        subscriber.next({type: 'prakriti content status replicated increment', cid: payload.cid})
        if (reply.persistent) {
            subscriber.next({type: 'prakriti content status persisted increment', cid: payload.cid})
        }
    }))

    return combineLatest(contentsWithReplies.map(({reply$}) => reply$.pipe(first()))).pipe(timeout(2500)).toPromise()
}

export {
    putContents
}
