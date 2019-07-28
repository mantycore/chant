import produce from 'immer'
import initialState from './initialState.js'
import { copy, handleUrl } from './utils.js'

function reducer(state, action) {
    //console.log("RDCR", action)
    const newState = produce(state, draft => {
        switch (action.type) {
            case 'epic attachment download start':
            case 'attachment load start':
                draft.attachmentIsLoading[action.cid] = 'loading'
                break
            case 'epic attachment download failure':
            case 'attachment load failure':
                draft.attachmentIsLoading[action.cid] = 'failure'
                break
            case 'epic attachment download success':
            case 'attachment load success':
                draft.attachmentIsLoading[action.cid] = 'loaded'
                break

            case 'hashchange': // from browser entry file
                handleUrl(draft)
                break

            case 'update': // from common
                copy(draft, action)
                // hacky, improve
                if (action.mhType === 'posts initialized') {
                    draft.displaySplash = false
                    handleUrl(draft)
                }
                break
            case 'init': // from redux entry file
                copy(draft, action)
                //handleUrl(draft)
                draft.getAndStoreContent = action.state.getAndStoreContent

                draft.putPost = action.state.putPost
                draft.revoke = action.state.revoke
                draft.updatePost = action.state.updatePost

                draft.crypto = action.state.crypto
                if (action.state.initiation) {
                    draft.initiation = true
                    draft.secretCode = action.state.secretCode
                    draft.passwordEditable = false
                }
                break

            case 'update post': // react surah-item/meta update (?)
                draft.postBeingEdited.body = action.post.result.body.text
                draft.postBeingEdited.mode = 'patch'
                draft.postBeingEdited.post = action.post
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
