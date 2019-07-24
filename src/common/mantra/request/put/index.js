import broadcast from 'Mantra/broadcast.js'
import { waitForReplies } from 'Mantra/reply.js'
import { Observable, combineLatest } from 'rxjs'
import { first, timeout } from 'rxjs/operators'

const putContent = (payload, peers, pr) => {
    const persistingPeers = Array.from(peers.values()).filter(peer => peer.persistent)
    const mid = broadcast({type: 'req content put', ...(payload ? {payload} : {})}, true, persistingPeers, pr)

    return new Observable(observer => waitForReplies(mid, observer))
}

const putContents = async (contents, peers, pr, contentStore) => {
    const contentsWithReplies = contents.map(content => ({content, reply$: putContent(content.payload, peers, pr)}))

    console.log('contentsWithReplies', contentsWithReplies)

    contentsWithReplies.forEach(({content, reply$}) => reply$.subscribe(reply => {
        console.log("we got a reply from the observable", reply)
        //TODO: do it better, maybe have a Map of nodes that replicated this content
        content.replicated += 1
        if (reply.persistent) {
            content.persisted += 1
        }
    }))

    const result = combineLatest(contentsWithReplies.map(({reply$}) => reply$.pipe(first()))).pipe(timeout(2500)).toPromise()
    console.log('result', result)
    return result
}

export {
    putContents
}
