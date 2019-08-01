import { ofType, combineEpics } from 'redux-observable'
import { Observable, of, merge } from 'rxjs'
import { mergeMap, map, catchError, tap } from 'rxjs/operators'

import Client from 'peer-relay'
import { Buffer } from 'buffer'
import toCID from 'Common/cid.js'
import log from 'Common/log.js'
import observableAsync from 'Common/observableAsync.js'
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

export default combineEpics(
    (action$, state$) => action$.pipe(
        ofType('mantra init'),
        mergeMap(() => new Observable(subscriber => {
            console.log(state$.value.init.prOptions)
            const pr = new Client(state$.value.init.prOptions)
            // was in Browser/
            // TODO: move to Browser epic
            crypto.setPassphrase(state$.value.init.secretCode)
            // was in Mantra/
            pr.on('peer', nid => subscriber.next({type: 'mantra pr peer', nid}))
            pr.on('message', (mantra, nid) => subscriber.next({type: 'mantra pr message', mantra, nid}))
            // was in root setInterval
            setInterval(() => subscriber.next({type: 'mantra interval ping'}), 10000)
            subscriber.next({type: 'mantra init complete', pr})
        }))
    ),

    (action$, state$) => action$.pipe(
        ofType('mantra pr peer'),
        mergeMap(observableAsync(async (action, subscriber) => {
            // was in Mantra/ (on peer)
            const newPoemata = await getPosts(action.nid, state$.value.init.pr)
            const localPoemata = state$.value.poema.poemata

            for (const newPoema of newPoemata) {
                if (!localPoemata.find(localPoema => localPoema.pid === newPoema.pid)) {
                    subscriber.next({type: 'mantra incoming poema', poema: newPoema})
                }
                /* else increase replication count of poema */
            }
            subscriber.complete()
        }))
        //catchError(error => of({type: 'mantra req poemata get error', error}))
    ),

    (action$, state$) => action$.pipe(
        ofType('mantra incoming poema'),
        mergeMap(({poema}) => new Observable(subscriber => {
            const state = state$.value

            // was in storePost
            subscriber.next({type: 'prakriti poema put', poema, status: {source: 'choir'}})

            if (state.init.isServerNode && poema.attachments) {
                poema.attachments.map(async attachment => {
                    if (!(attachment.cid in state.poema.contents)) {
                        subscriber.next({type: 'mantra req content get', cid: attachment.cid})
                    }
                })
            }

            subscriber.complete()
        }))
    ),

    // there are two things of resources mapped to prakriti put: mantra incoming ones and maya created ones.
    // handled above in single pipe :)
    /*(action$, state$) => action$.pipe(
        ofType('mantra incoming poema'),
        map(({poema}) => ({type: 'prakriti poema put', poema}))
    ),*/

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
                    type: 'mantra incoming content',
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
                    type: 'mantra err content get', cid
                } 
            }
        })
    ),

    (action$, state$) => action$.pipe(
        ofType('mantra incoming content'),
        map(({cid, content}) => ({type: 'prakriti content put', cid, payload: content, status: {source: 'choir'}}))
    ),

    (action$, state$) => action$.pipe(
        ofType('mantra pr message'), // incoming mantra
        mergeMap(observableAsync(async ({mantra, nid}, subscriber) => { // async is only for CID calc
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
                subscriber.next({type: 'mantra pr message success', umid})

                switch (mantra.type) {
                    case 'req poema put': {
                        if (!state.poema.poemata.find(poema =>
                                poema.pid === mantra.payload.pid)) {
                            broadcast(mantraToForward, false, peers, pr)
                            // TODO: optimize: do not sent the post to nodes we know already have it
                            subscriber.next({type: 'mantra incoming poema', poema: mantra.payload})
                        }
                        //mantra.post.body = await getContent(mantra.post.bodyCid)
                    }
                    break

                    case 'res poema put':
                        //handleReply()
                    break

                    case 'req content put':
                        const cid = await toCID(mantra.payload.buffer) 
                        if (!(cid in state.poema.contents)) {
                            subscriber.next({type: 'mantra incoming content', payload: mantra.payload}) //todo: counts
                            // do not rebroadcast?
                        }
                        send(originNid, {type: 'res content put', status: {persistent: state.init.isServerNode}, re: mantra.mid}, false, pr)
                    break

                    /* called back when content is put to other nodes with react post*form submit */
                    case 'res content put':
                        handleReplies(nid.toString('hex'), mantra, mantra.status)
                    break

                    /* called from mantra.incoming.poema */
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

                    /* called from mantra.interval.ping */
                    case 'ping': {
                        const payload = nodeStatus(state)
                        send(nid, {type: 'pong', payload, re: mantra.mid}, false, pr)
                        subscriber.next({type: 'prakriti peer put', nid, payload: mantra.payload})
                    }
                    break

                    case 'pong': {
                        handleReply(mantra /*, mantra.payload*/)
                        /* todo: move to mantra interval ping?*/
                        subscriber.next({type: 'prakriti peer put', nid, payload: mantra.payload})
                    }
                    break

                    /* called from mantra.pr.peer */
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
        ofType('mantra interval ping'),
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
                    subscriber.next({type: 'mantra outgoing ping success'}) // discarded, since ping logic is handled in pr mantra
                } catch (error) {
                    subscriber.next({type: 'prakriti peer delete', hexNid})
                }
            }
            subscriber.complete()
        }))
    ),
)
