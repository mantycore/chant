import produce from 'immer'
import initialState from './initialState.js'

import bs58 from 'bs58'
function handleUrl(draft) {
    draft.newState.suwarList.autoScrollAllowed = true
    const matchData = window.location.hash.match('#(.*)')
    let path, mode, tag = null, sutraPid = null, rengaId = null, scrollTrigger = false

    if (matchData) {
        path = matchData[1].split('/')

        if (path[0] === 'directs') {
            mode = 'directs list'
        } else if (path[1]) {
            if (path[1] === '~') {
                mode = 'tilde' //todo for v3
            } else if (bs58.decode(path[1]).length === 64) {
                sutraPid = path[1]
                if (path[2] && path[2] === 'direct') {
                    if (path[3] && bs58.decode(path[3]).length === 64) {
                        mode = 'direct conversation'
                        rengaId = path.slice(0, 4).join('/')
                        sutraPid = null //??
                        tag = null //??
                        scrollTrigger = true
                    } else {
                        mode = 'direct'
                    }
                } else {
                    mode = 'thread'
                    if (path.length > 2) {
                        scrollTrigger = true //TODO: scroll to a specific post in thread. #/pid/head ?
                        //was: scrollTrigger plusplus
                    }
                }
            } else {
                mode = 'tag'
                tag = path[1]
            }
        } else {
            mode = 'tag'
            tag = 'd'
            path = ['', 'd', ''] //todo: redirect in epic?
        }
    } else {
        mode = 'tag'
        tag = 'd'
        path = ['', 'd', '']
    }

    Object.assign(draft.maya, {path, mode, tag, sutraPid, rengaId, scrollTrigger})
}

function reducer(state, action) {
    //console.log("RDCR", action)
    const newState = produce(state, draft => {
        switch (action.type) {
            case 'init': // from redux entry file
                draft.maya.theme = localStorage.getItem('theme') || 'light'
                handleUrl(draft)
                if (action.state.initiation) {
                    draft.initiation = true
                    draft.secretCode = action.state.secretCode
                    draft.passwordEditable = false
                }
            break

            case 'hashchange': {// from init epic
                handleUrl(draft)
            }
            break

            case 'maya theme toggle': {
                draft.maya.theme = draft.maya.theme === 'light'
                    ? 'dark'
                    : 'light'
            }
            break

            case 'maya suwarList stopAutoScroll': {
                draft.newState.suwarList.autoScrollAllowed = false
            }
            break

            //case 'update post': // react surah-item/meta update (?)
            case 'react surah-item/meta update':
                draft.postBeingEdited.body = action.surah.result.body.text
                draft.postBeingEdited.mode = 'patch'
                draft.postBeingEdited.post = action.surah
                break
            case 'post body change': // react post-form body change
                draft.postBeingEdited.body = action.event.target.value
                break
            case 'cancel post update': // react post-form#update cancel
                draft.postBeingEdited.body = ''
                draft.postBeingEdited.mode = 'put'
                draft.postBeingEdited.post = null
                draft.newState.postForm.filesToLoad = []
                break

            case 'epic post-form submit success':
            case 'post submit success':
                draft.postBeingEdited.body = ''
                draft.postBeingEdited.mode = 'put'
                draft.postBeingEdited.post = null
                draft.newState.postForm.filesToLoad = []
                draft.newState.suwarList.scrollTrigger ++
                break

            /* ----- */

            case 'react post-form files change':
                draft.newState.postForm.filesToLoad = action.files
                break

            /* ----- */

            case 'react post-form unlock password':
                draft.passwordEditable = true
                break
            case 'react post-form change password':
                draft.secretCode = action.value.target.value
                break
            case 'epic post-form#password accepted':
                draft.initiation = false
                break

        }
    })
    return newState
}

export default reducer
