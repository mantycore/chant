import broadcast from 'Mantra/broadcast.js'
import { waitForReplies } from 'Mantra/reply.js'
import { Observable, combineLatest } from 'rxjs'
import { first, timeout, share } from 'rxjs/operators'

const putContent = (payload, peers, pr) => {
    const persistingPeers = Array.from(peers.values()).filter(peer => peer.persistent)
    const mid = broadcast({type: 'req content put', ...(payload ? {payload} : {})}, true, persistingPeers, pr)

    return new Observable(observer => waitForReplies(mid, persistingPeers.map(peer => peer.nid.toString('hex')), observer))
}

const putContents = async (subscriber, contents, peers, pr) => {
    const contentsWithReplies = contents.map(content => ({payload, reply$: putContent(payload, peers, pr).pipe(share())}))

    contentsWithReplies.forEach(({content, reply$}) => reply$.subscribe(reply => {
        //TODO: do it better, maybe have a Map of nodes that replicated this content
        subscriber.next({type: 'prakriti content status replicated increment', cid: content.cid})
        if (reply.persistent) {
            subscriber.next({type: 'prakriti content status persisted increment', cid: content.cid})
        }
    }))

    return combineLatest(contentsWithReplies.map(({reply$}) => reply$.pipe(first()))).pipe(timeout(2500)).toPromise()
}

export {
    putContents
}
