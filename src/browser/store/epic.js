import { ofType, combineEpics } from 'redux-observable'
import { of, merge, race, timer } from 'rxjs'
import { mergeMap, map, first } from 'rxjs/operators'
import observableAsync from 'Common/observableAsync.js'
import { putPost, updatePost, revoke } from 'Mantra/request/put/poema.js'
import { getPoemata } from 'Mantra/request/get/index.js'

const waitForResource = (action$, state$, subscriber, predicate) => {
    race(
        state$.pipe(first(predicate), map(_ => 'success')),
        timer(4000).pipe(map(_ => 'timeout')),
        action$.pipe(ofType('hashchange'), first(), map(_ => 'cancel'))
    ).subscribe(result => {
        console.log('POEMA FOUND?', result)
    })
}

const requestResource = async (action$, state$, subscriber) => {
    let state = state$.value
    let predicate, params

    switch (state.maya.mode) {
        case 'tag':
            predicate = state =>
                (console.log("in predicate", state),
                state.poema.poemata.find(poema => poema.tags && poema.tags.includes(state.maya.tag))
                )
            params = {tag: state.maya.tag}
        break

        case 'direct':
        case 'thread':
            predicate = state =>
                state.poema.poemata.find(poema => poema.pid === state.maya.sutraPid)
            params = {opid: state.maya.sutraPid}
        break

        case 'direct conversation':
            predicate = state =>
                state.surah.rengashu.find(renga => renga.id === state.maya.rengaId)
            params = {rid: state.maya.rengaId}
        break

        case 'directs list':
            predicate = state => state.surah.rengashu.length > 0
            params = {}
        break
    }

    if (!predicate(state) && Object.keys(params).length > 0) {
        getPoemata(params, state.mantra.peers, state.init.pr).subscribe(({resolution, nid}) => {
            //TODO: fix as per common epic
            resolution.forEach(poema => 
                subscriber.next({type: 'mantra incoming poema', nid, poema}))
        })
    }
    waitForResource(action$, state$, subscriber, predicate)
}

const epic = combineEpics(
    (action$, state$) => action$.pipe(
        ofType('init'),
        mergeMap(observableAsync(async (action, subscriber) => {
            window.addEventListener('hashchange', event =>
                subscriber.next({type: 'hashchange', event}))
            //requestResource(action$, state$, subscriber)
            state$.pipe(
                first(state =>
                    Object.values(state.mantra.peers).find(peer => peer.persistent)),
            ).subscribe(() => subscriber.next({type: '*** first*persistent*peer ***'}))
        }))
    ),

    (action$, state$) => action$.pipe(
        ofType('*** first*persistent*peer ***'),
        mergeMap(observableAsync(async (action, subscriber) => {
            requestResource(action$, state$, subscriber)
        }))
    ),

    (action$, state$) => action$.pipe(
        ofType('hashchange'),
        mergeMap(observableAsync(async (action, subscriber) => {
            requestResource(action$, state$, subscriber)
        }))
    ),

    (action$, state$) => action$.pipe(
        ofType('maya theme toggle'),
        map(action => {
            localStorage.setItem('theme', state$.value.maya.theme)
            return {type: 'maya theme toggle complete'}
        })
    ),

    (action$, state$) => action$.pipe(
        ofType('react surah-item/meta revoke'),
        mergeMap(observableAsync(async ({surah}, subscriber) => {
            if (window.confirm("Really revoke the post?")) {
                await revoke(state$.value, subscriber, surah.origin)
                subscriber.next({type: 'epic surah-item revoke success'})
            } else {
                subscriber.next({type: 'epic surah-item revoke cancel'})
            }
            subscriber.complete()
        }))
    ),
    
    /*(action$, state$) => action$.pipe(
        ofType('react surah-item/attachment download'),
        mergeMap(({cid}) => merge( // switchMap? concat?
            of({type: 'epic attachment download start', cid}),
            (async () => {
                return {type: 'mantra req content get', cid}
                try {
                    await state$.value.getAndStoreContent(cid)
                    return {type: 'epic attachment download success', cid}
                } catch (error) {
                    console.log(error);
                    return {type: 'epic attachment download failure', cid}
                }
            })()
        ))
    ),*/

    (action$, state$) => action$.pipe(
        ofType('react surah-item/attachment download'),
        map(({cid}) => ({type: 'mantra req content get', cid}))
    ),

    /* Not like the previous async version, these actions are emitted
       on any incoming content, not only triggered by the mapping above.
       Think about this! */
    /*(action$, state$) => action$.pipe(
        ofType('prakriti content put'),
        map(({cid}) => ({type: 'epic attachment download success', cid}))
    ),

    (action$, state$) => action$.pipe(
        ofType('mantra err contetn get'),
        map(({cid}) => ({type: 'epic attachment download failure', cid}))
    ),*/

    /* :::::::::::::::: */

    (action$, state$) => action$.pipe(
        ofType('react post-form submit'),
        mergeMap(observableAsync(async (action, subscriber) => {
            const state = state$.value
            const body = state.postBeingEdited.body //bodyRef.current.value
            const filesToLoad = state.newState.postForm.filesToLoad

            if (state.postBeingEdited.mode === 'patch') {
                let post = {body} // so far, only post body can be updated
                await updatePost(
                    state,
                    subscriber,
                    post,
                    state.postBeingEdited.post.origin,
                    'patch'
                )
                subscriber.next({type: 'epic post-form submit success'})
            } else {
                let post = {body, filesToLoad}
                Object.assign(post, action.protoPost) //todo: move protopost to state?
                const pid = await putPost(state, subscriber, post)

                if (state.maya.mode === 'direct') {
                    const path = state$.value.maya.path
                    path[3] = pid
                    window.location.hash = path.slice(0,4).join('/')
                } else if (state.maya.mode === 'tag') {
                    window.location.hash = `/${pid}/`
                }
                subscriber.next({type: 'epic post-form submit success'})
            }
            subscriber.complete()
        }))
    ),
    //action$ => action$.ofType('react surah-item meta update')

    (action$, state$) => action$.pipe(
        ofType('react post-form accept password'), // -> #password accept
        map(() => {
            localStorage.setItem('Secret code', draft.secretCode)
            state$.value.init.crypto.setPassphrase(draft.secretCode)
            return {type: 'epic post-form#password accepted'}
        })
    ),

    /* ---- */

    (action$, state$) => action$.pipe(
        ofType('react maya/sutra update'),
        map(action => {
            if (state$.value.maya.sutraPid !== action.pid) {
                window.location.hash = `#/${action.pid}/` //TODO: think about it
            }
            return {type: 'epic navigation complete'}
        })
    ),

    (action$, state$) => action$.pipe(
        ofType('react maya/tag update'),
        map(action => {
            //if (state$.value.maya.tag !== action.tag) {
                window.location.hash = `#/${action.tag}/` //TODO: think about it
            //}
            return {type: 'epic navigation complete'}
        })
    ),

    (action$, state$) => action$.pipe(
        ofType('react maya rengashu-list'),
        map(action => {
            if (state$.value.maya.mode !== 'directs list') {
                window.location.hash = `#directs` //TODO: think about it
            }
            return {type: 'epic navigation complete'}
        })
    ),

    (action$, state$) => action$.pipe(
        ofType('react maya/renga update'),
        map(action => {
            if (state$.value.maya.rengaId !== action.id) {
                window.location.hash = `#${action.id}`
            }
            return {type: 'epic navigation complete'}
        })
    )
)

export default epic
