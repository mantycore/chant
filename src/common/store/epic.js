// @flow
// @flow-runtime
import type { CommonPrakriti, Peer } from './.flow/'
import type { PeerRelayClient } from 'Mantra/.flow/'
import type { Poema } from 'Psalm/.flow/'

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
    if (typeof state.init.isServerNode !== 'boolean') {
        throw new Error()
    }
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
            const state: CommonPrakriti = state$.value
            console.log(state.init.prOptions)
            const pr: PeerRelayClient = new Client(state.init.prOptions)
            // was in Browser/
            // TODO: move to Browser epic
            crypto.setPassphrase(state.init.secretCode)
            // was in Mantra/

            /* TODO: maybe do it on any new peer, not only on peer event? Study the peer-repaly protocol better. */
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
            const state: CommonPrakriti = state$.value
            const newPoemata = await getPosts(action.nid, state.init.pr)
            const localPoemata = state.poema.poemata

            for (const newPoema of newPoemata) {
                if (!localPoemata.find(localPoema => localPoema.pid === newPoema.pid)) {
                    subscriber.next({type: 'mantra incoming poema', nid: action.nid, poema: newPoema})
                }
                /* else increase replication count of poema */
            }
            subscriber.complete()
        }))
        //catchError(error => of({type: 'mantra req poemata get error', error}))
    ),

    (action$, state$) => action$.pipe(
        ofType('mantra incoming poema'),
        mergeMap(({poema, nid}) => new Observable(subscriber => {
            const state: CommonPrakriti = state$.value

            // was in storePost
            subscriber.next({type: 'prakriti poema put', poema, source: 'choir', nid})

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
            const state: CommonPrakriti = state$.value
            //const state = state$.value
            const peers = state.mantra.peers
            const pr = state.init.pr
            const cid = action.cid

            // Flow cast through any because .values return Array<mixed>
            const nid = ((Object.values(peers): any)[0]: Peer).nid //TODO: at least find the first persisting node!
            //const nid = Object.values(peers)[0].nid //TODO: at least find the first persisting node!

            try {
                return {
                    type: 'mantra incoming content',
                    cid,
                    nid,
                    ...(action.haiku ? {haiku: action.haiku} : {}),
                    content: await getContent(cid, nid, pr)
                    //when BSON was used, we had to call buffer(Binary).buffer; with msgpack it's just buffer
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
        map(({cid, nid, content}) => ({type: 'prakriti content put', cid, nid, payload: content, source: 'choir'}))
    ),

    (action$, state$) => action$.pipe(
        ofType('mantra pr message'), // incoming mantra
        mergeMap(observableAsync(async ({mantra, nid}, subscriber) => { // async is only for CID calc
            // was in Mantra/ (on message)
            const state: CommonPrakriti = state$.value
            const peers = state.mantra.peers
            const pr = state.init.pr
            if (!pr) {
                throw new Error()
            }

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
                            subscriber.next({type: 'mantra incoming poema', nid: originNid, poema: mantra.payload})
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
                            subscriber.next({type: 'mantra incoming content', cid, nid: originNid, content: mantra.payload}) //todo: counts
                            // do not rebroadcast?
                            // old idea: send to all nodes, but only server nodes should store it.
                            // also old TODO: optimize: do not sent the post to nodes we know already have it
                        }

                        if (typeof state.init.isServerNode !== 'boolean') {
                            throw new Error()
                        }

                        send(originNid, {type: 'res content put', status: {persistent: state.init.isServerNode}, re: mantra.mid}, false, pr)
                    break

                    /* called back when content is put to other nodes with react post*form submit */
                    case 'res content put':
                        handleReplies(nid, mantra, mantra.status)
                    break

                    /* called from mantra.incoming.poema */
                    case 'req content get': {
                        const content = state.poema.contents[mantra.params.cid] //todo: think about it
                        if (content && content.payload) {
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
                        let payload = state.poema.poemata

                        let params = mantra.params
                        if (params) {
                            payload = payload.filter((poema: Poema) => 
                                (!params.pid || poema.pid === params.pid) &&
                                (!params.opid || (poema.opid && poema.opid === params.opid)) &&
                                (!params.tag || (Array.isArray(poema.tags) && poema.tags.includes(params.tag))) &&
                                (!params.rid || (poema.conversationId && poema.conversationId === params.rid))
                            )
                            // All of the selectors below may be implemented here, or may be implemented in the function
                            // creating the req-poemata-get request, probably in Maya.

                            // For each poema, it is also necessary to load all poemata having update ayah on it.

                            // It is not possible to find poemata by ayah if it is encrypted,
                            // so all updating poemata must be in the same renga as the updated one!
                            // (Or we need to allow for update ayah to be stored in haiku unencrypted)

                            // We also _could_ prefetch other kinds of ayah-linked poemata, posts referencing this with
                            // hyperlinks or referenced by it; and maybe something more. (And also prefetch content!)

                            // If we are displaying a tag, it is necessary to have all (or newest N) o-psalms in the tag.
                            // It is also possible to preload all sutras in the tag (or newest N); this must be handled not here,
                            // but in the code placing req-poemata-get.

                            // If we are displaying a sutra, we need all the psalms in the sutra (sharing the same opid)
                            // For each of these psalms, it that psalms starts a sutra, we also need _that_ sutra.
                            // For each of psalms of subsutra, we also need to know if there are further subsubsutra branches,
                            // but not necessary its psalmoi; however, current logic doesnt' allow to transfer
                            // this kind of metadata with the psalm.
                            // We also want a parent tag(s?) or parent sutra (or only those suwar from
                            // parent sutra which start a subsutra themselves)

                            // If we are displaying a psalm (in sutra), we want its parent sutra (or, if it is a head in a sutra, then that sutra)
                            // and all the related objects, see above.

                            // If we are displaying a renga, or a psalm belonging to renga, we want all the haiku with the matching rid.
                            // We also want the objects to display conversations list (see below). Maybe for renga psalms it is possible
                            // to display some parallel of subsutras (maybe a fact that there is a direct (subdirect? subrenga?) directed at 
                            // the renga psalm).

                            // To display conversations list, we want all the hokku and waki. It may be dificult to find just them.
                            // The simplest thing is to find all haiku directed to plain psalms (but see above on subrengas)
                            // It is also possible for user node to track rids and request only hokku + waki for specific rids;
                            // but maybe it is easier to just store hokku + waki locally.

                            // (It is also very ironic that hokku is the only unencrypted poema in renga; while haiku is an encrypted psalm.
                            // Think about terminology better.)
                        }

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
        catchError(error => of({type: 'mantra pr message error', error}))
    ),

    (action$, state$) => action$.pipe(
        ofType('mantra interval ping'),
        mergeMap(observableAsync(async (action, subscriber) => {
            const state: CommonPrakriti = state$.value
            //const state = state$.value
            const peers = state.mantra.peers
            const pr = state.init.pr
            const payload = nodeStatus(state)
            const results = [] // TODO: find a way to combine async/await and new Observable, or something

            // was in root setInterval
            // [hexNid, peer]: [string, Peer] is working in flow, but fails with flow-runtime
            // Flow cast through any because .entries return Array<[string, mixed]>
            for (const [hexNid: string, peer: Peer] of (Object.entries(peers): any)) {
            //for (const [hexNid, peer] of Object.entries(peers)) {
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
