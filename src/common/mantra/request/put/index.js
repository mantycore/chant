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

    return new Observable(observer => waitForReplies(mid, mantra, persistingPeers.map(peer => peer.nid), observer))
}

const putContents = async (subscriber, contents, peers, pr) => {
    const contentsWithReplies = contents.map(payload => ({payload, reply$: putContent(payload, peers, pr).pipe(share())}))

    contentsWithReplies.forEach(({payload, reply$}) => reply$.subscribe(({resolution, nid}) => {
        subscriber.next({type: 'prakriti content status replicated', cid: payload.cid, nid}) // persistent: resolution.persistent
    }))

    return combineLatest(contentsWithReplies.map(({reply$}) => reply$.pipe(first()))).pipe(timeout(2500)).toPromise()
}

export {
    putContents
}
