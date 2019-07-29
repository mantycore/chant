import { ofType, combineEpics } from 'redux-observable'
import { of, merge } from 'rxjs'
import { mergeMap, map } from 'rxjs/operators'

const epic = combineEpics(
    (action$, state$) => action$.pipe(
        ofType('react surah-item/meta revoke'),
        mergeMap(async action => {
            if (window.confirm("Really revoke the post?")) {
                await state$.value.revoke(post)
                return {type: 'epic surah-item revoke success'}
            }
            return {type: 'epic surah-item revoke cancel'}
        })
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
        mergeMap(async action => {
            const state = state$.value
            const body = state.postBeingEdited.body //bodyRef.current.value
            const filesToLoad = state.newState.postForm.filesToLoad

            if (state.postBeingEdited.mode === 'patch') {
                let post = {body} // so far, only post body can be updated
                await state.updatePost(post, state.postBeingEdited.post.origin, 'patch')
                return {type: 'epic post-form submit success'}
            } else {
                let post = {body, filesToLoad}
                Object.assign(post, action.protoPost) //todo: move protopost to state?
                const pid = await state.putPost(post)

                if (state.newState.maya.mode === 'direct') {
                    const path = window.location.hash.match('#(.*)')[1].split('/')
                    path[3] = pid
                    window.location.hash = path.slice(0,4).join('/')
                }
                return {type: 'epic post-form submit success'}
            }
        })
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
