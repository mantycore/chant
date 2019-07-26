import broadcast from 'Mantra/broadcast.js'
import { waitForReplies } from 'Mantra/reply.js'
import { Observable, combineLatest } from 'rxjs'
import { first, timeout, share } from 'rxjs/operators'

const putContent = (payload, peers, pr) => {
    const persistingPeers = Array.from(peers.values()).filter(peer => peer.persistent)
    const mid = broadcast({type: 'req content put', ...(payload ? {payload} : {})}, true, persistingPeers, pr)

    return new Observable(observer => waitForReplies(mid, persistingPeers.map(peer => peer.nid.toString('hex')), observer))
}

const putContents = async (contents, peers, pr, contentStore) => {
    const contentsWithReplies = contents.map(content => ({content, reply$: putContent(content.payload, peers, pr).pipe(share())}))

    contentsWithReplies.forEach(({content, reply$}) => reply$.subscribe(reply => {
        //TODO: do it better, maybe have a Map of nodes that replicated this content
        content.replicated += 1
        if (reply.persistent) {
            content.persisted += 1
        }
        //TODO: notify that it is updated
    }))

    return combineLatest(contentsWithReplies.map(({reply$}) => reply$.pipe(first()))).pipe(timeout(2500)).toPromise()
}

export {
    putContents
}
