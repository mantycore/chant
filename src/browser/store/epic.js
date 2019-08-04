import { ofType, combineEpics } from 'redux-observable'
import { of, merge } from 'rxjs'
import { mergeMap, map } from 'rxjs/operators'
import observableAsync from 'Common/observableAsync.js'
import { putPost, updatePost, revoke } from 'Mantra/request/put/poema.js'

const epic = combineEpics(
    (action$, state$) => action$.pipe(
        ofType('init'),
        mergeMap(observableAsync(async (action, subscriber) => {
            window.addEventListener('hashchange', event =>
                subscriber.next({type: 'hashchange', event}))
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

                if (state.newState.maya.mode === 'direct') {
                    const path = window.location.hash.match('#(.*)')[1].split('/')
                    path[3] = pid
                    window.location.hash = path.slice(0,4).join('/')
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
            if (state$.value.newState.maya.sutraPid !== action.pid) {
                window.location.hash = `#/${action.pid}/` //TODO: think about it
            }
            return {type: 'epic navigation complete'}
        })
    ),

    (action$, state$) => action$.pipe(
        ofType('react maya/tag update'),
        map(action => {
            //if (state$.value.newState.maya.tag !== action.tag) {
                window.location.hash = `#/${action.tag}/` //TODO: think about it
            //}
            return {type: 'epic navigation complete'}
        })
    ),

    (action$, state$) => action$.pipe(
        ofType('react maya rengashu-list'),
        map(action => {
            if (state$.value.newState.maya.mode !== 'directs list') {
                window.location.hash = `#directs` //TODO: think about it
            }
            return {type: 'epic navigation complete'}
        })
    ),

    (action$, state$) => action$.pipe(
        ofType('react maya/renga update'),
        map(action => {
            if (state$.value.newState.maya.rengaId !== action.id) {
                window.location.hash = `#${action.id}`
            }
            return {type: 'epic navigation complete'}
        })
    )
)

export default epic
