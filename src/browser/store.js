import { createStore } from 'redux'
import produce from 'immer'
import bs58 from 'bs58'

const initialState = {
    peers: new Set(),
    poemata: [],
    suwar: [],
    contentStore: new Map(),
    rengashu: [],
    getAndStoreContent: () => {},
    putPost: () => {},
    revoke: () => {},
    attachmentIsLoading: {},

    postsMode: 'tag',
    opost: null,
    tag: 'd',

    postBeingEdited: {
        body: '',
        mode: 'put',
        post: null
    },

    displaySplash: true,

    newState: {
        maya: {
            tag: 'd',
            sutraPid: null
        }
    }
}

function copy(draft, action) {
    draft.poemata = [...action.state.poemata]
    draft.suwar = [...action.state.suwar]
    draft.rengashu = [...action.state.rengashu]
    draft.contentStore = new Map(action.state.contentStore)
    draft.peers = new Set(action.state.peers)
}

function handleUrl(draft) {
    draft.opost = null
    draft.tag = null
    const matchData = window.location.hash.match('#(.*)')
    if (!matchData) {
        window.location.hash = "#/4ZtbyWyXQvtypNdUaGCUqpYKB3VjjC291QA8RGxLzEqhL1qyozfiQvbgkhRxLhMMcweqQSzdapcYfRZuXsYHMiDQ"
        return
    }
    const path = matchData[1].split('/')
    if (path[0] === 'directs') {
        draft.postsMode = 'directs list'
    } else if (path[1] === '~') {
        draft.postsMode = 'tilde'
    } else if (path[1] && bs58.decode(path[1]).length === 64) {
        draft.opost = draft.suwar.find(surah => surah.pid === path[1])
        //TODO: or else!
        if (path[2] && path[2] === 'direct') {
            if (path[3] && bs58.decode(path[3]).length === 64) {
                draft.postsMode = 'direct conversation'
                draft.conversationId = path.slice(0, 4).join('/')
            } else {
                draft.postsMode = 'direct'
            }
        } else {
            draft.postsMode = 'thread'
        }
    } else if (path[1]) {
        draft.postsMode = 'tag'
        draft.tag = path[1]
    } else {
        window.location.hash = "#/4ZtbyWyXQvtypNdUaGCUqpYKB3VjjC291QA8RGxLzEqhL1qyozfiQvbgkhRxLhMMcweqQSzdapcYfRZuXsYHMiDQ"
    }
}

function reducer(state = initialState, action) {
    // console.log("RDCR", action)
    const newState = produce(state, draft => {
        switch (action.type) {
            case 'attachment load start':
                draft.attachmentIsLoading[action.cid] = 'loading'
                break
            case 'attachment load failure':
                draft.attachmentIsLoading[action.cid] = 'fail'
                break
            case 'attachment load success':
                draft.attachmentIsLoading[action.cid] = 'loaded'
                break

            case 'hashchange':
                handleUrl(draft)
                break

            case 'update':
                copy(draft, action)
                // hacky, improve
                if (action.mhType === 'posts initialized') {
                    draft.displaySplash = false
                    handleUrl(draft)
                }
                break
            case 'init':
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
            case 'unlock password':
                draft.passwordEditable = true
                break
            case 'change password':
                draft.secretCode = action.value.target.value
                break
            case 'accept password':
                //ouch, effects
                localStorage.setItem('Secret code', draft.secretCode)
                draft.crypto.setPassphrase(draft.secretCode)

                draft.initiation = false
                break

            case 'update post':
                draft.postBeingEdited.body = action.post.result.body.text
                draft.postBeingEdited.mode = 'patch'
                draft.postBeingEdited.post = action.post
                break
            case 'post body change':
                draft.postBeingEdited.body = action.event.target.value
                break
            case 'cancel post update':
            case 'post submit success':
                draft.postBeingEdited.body = ''
                draft.postBeingEdited.mode = 'put'
                draft.postBeingEdited.post = null
                break

            /* ----- */

            case 'react maya sutra update':
                draft.newState.maya.sutraPid = action.pid
                break

            case 'react maya tag update':
                if (draft.newState.maya.tag !== action.tag) {
                    draft.newState.maya.sutraPid = null
                    draft.newState.maya.tag = action.tag
                }
                break

        }
    })
    return newState
}

const store = createStore(reducer)
export default store
