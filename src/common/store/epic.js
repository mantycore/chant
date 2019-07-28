import { ofType, combineEpics } from 'redux-observable'
import { Observable, of, merge } from 'rxjs'
import { mergeMap, map, catchError, tap } from 'rxjs/operators'

import { Buffer } from 'buffer'
import log from 'Common/log.js'
import crypto from 'Common/crypto.js' // TODO: move to Browser epic
import send from 'Mantra/send.js'
import broadcast from 'Mantra/broadcast.js'
import { ping, getPosts, getContent } from 'Mantra/request/get/'
import { handleReply, handleReplies } from 'Mantra/reply.js'

function nodeStatus(state) {
    return {
        type: state.init.isServerNode ? 'server' : 'browser',
        persistent: state.init.isServerNode, //TODO: think about better capabilities format
        name: 'Allium'
    }
}

function observableAsync(asyncFun) {
    return action => new Observable(subscriber => asyncFun(action, subscriber))
}

export default combineEpics(
    (action$, state$) => action$.pipe(
        ofType('init'),
        mergeMap(() => new Observable(subscriber => {
            const pr = state$.value.init.pr
            // was in Browser/
            // TODO: move to Browser epic
            crypto.setPassphrase(state$.value.init.secretCode)
            // was in Mantra/
            pr.on('peer', nid => subscriber.next({type: 'pr peer', nid}))
            pr.on('message', (mantra, nid) => subscriber.next({type: 'pr mantra', mantra, nid}))
            // was in root setInterval
            setInterval(() => subscriber.next({type: 'ping'}), 10000)
        }))
    ),

    (action$, state$) => action$.pipe(
        ofType('pr peer'),
        mergeMap(observableAsync(async (action, subscriber) => {
            // was in Mantra/ (on peer)
            const newPoemata = await getPosts(action.nid, state$.value.init.pr)
            const localPoemata = state$.value.poema.poemata

            for (const newPoema of newPoemata) {
                if (!localPoemata.find(localPoema => localPoema.pid === newPoema.pid)) {
                    subscriber.next({type: 'poema store from remote', poema: newPoema})
                    //todo: aggregate
                    //todo: download attachments
                }
                /* else increase replication count of poema */
            }
            subscriber.complete()
        }))
        //catchError(error => of({type: 'mantra req poemata get error', error}))
    ),

    (action$, state$) => action$.pipe(
        ofType('poema store from remote'),
        mergeMap(({poema}) => new Observable(subscriber => {
            const state = state$.value

            // was in storePost
            if (/*state.init.isServerNode &&*/ poema.attachments) {
                poema.attachments.map(async attachment => {
                    if (!(attachment.cid in state.poema.contents)) {
                        subscriber.next({type: 'mantra req content get', cid: attachment.cid})
                    }
                })
            }
            subscriber.complete()
        }))
    ),

    (action$, state$) => action$.pipe(
        ofType('mantra req content get'),
        // was in getAndStoreContent
        mergeMap(async action => {
            const state = state$.value
            const peers = state.mantra.peers
            const pr = state.init.pr
            const cid = action.cid
            try {
                return {
                    type: 'mantra res content get',
                    cid,
                    ...(action.haiku ? {haiku: action.haiku} : {}),
                    content: await getContent(cid, peers, pr)
                }
                /*if (isServerNode) {
                    await writeAttachment(storageAttachment)
                }*/
            } catch (error) {
                console.warn('Error downloading content', error, cid)
                return {
                    type: 'mantra err content get'
                } 
            }
        })
    ),

    (action$, state$) => action$.pipe(
        ofType('pr mantra'),
        mergeMap(({mantra, nid}) => new Observable(subscriber => {
            // was in Mantra/ (on message)
            const state = state$.value
            const peers = state.mantra.peers
            const pr = state.init.pr

            if (mantra.type !== 'ping' && mantra.type !== 'pong') {
                log.info('RECV', nid.toString('hex', 0, 2), mantra)
            }

            const originNid = mantra.origin
                ? ('data' in mantra.origin
                    ? Buffer.from(mantra.origin.data) // origin deserialized from text
                    : mantra.origin // from bson
                ) : nid

            const umid = `${originNid.toString('hex')}:${mantra.mid}`
            const mantraToForward = Object.assign({}, mantra, {origin: originNid})

            if (!(umid in state$.value.mantra.mantrasaProcessed)) {
                subscriber.next({type: 'pr mantra success', umid})

                switch (mantra.type) {
                    case 'req content get': {
                        const content = state.poema.contents[mantra.params.cid] //todo: think about it
                        if (content) {
                            const payload = content.payload
                            send(originNid, {type: 'res content get', payload, re: mantra.mid}, /*binary*/ true, pr)
                        } else {
                            broadcast(mantraToForward, true, peers, pr)
                        }

                    }
                    break

                    case 'res content get': {
                        handleReply(mantra, mantra.payload)
                    }
                    break

                    case 'ping': {
                        const payload = nodeStatus(state)
                        send(nid, {type: 'pong', payload, re: mantra.mid}, false, pr)
                        subscriber.next({type: 'mantra ping', nid, payload: mantra.payload})
                    }
                    break

                    case 'pong': {
                        handleReply(mantra /*, mantra.payload*/)
                        subscriber.next({type: 'mantra ping', nid, payload: mantra.payload})
                    }
                    break

                    case 'req poemata get': {
                        const payload = state.poema.poemata
                        send(originNid, {type: 'res poemata get', payload, re: mantra.mid}, false, pr)
                        broadcast(mantraToForward, false, peers, pr)
                    }
                    break

                    case 'res poemata get': {
                        handleReply(mantra, mantra.payload)
                    }
                    break
                }
            }
            subscriber.complete()
        })),
        catchError(error => of({type: 'pr mantra error', error}))
    ),

    (action$, state$) => action$.pipe(
        ofType('ping'),
        mergeMap(observableAsync(async (action, subscriber) => {
            const state = state$.value
            const peers = state.mantra.peers
            const pr = state.init.pr
            const payload = nodeStatus(state)
            const results = [] // TODO: find a way to combine async/await and new Observable, or something

            // was in root setInterval
            for (const [hexNid, peer] of Object.entries(peers)) {
                try {
                    // next ping will be send only after receiving the previous one
                    await ping(payload, peer.nid, pr) // mantra/request
                    subscriber.next({type: 'ping success'}) // discarded, since ping logic is handled in pr mantra
                } catch (error) {
                    subscriber.next({type: 'ping timeout', hexNid})
                }
            }
            subscriber.complete()
        }))
    ),
)
