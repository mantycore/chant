import { createStore } from 'redux'
import produce from 'immer'
import bs58 from 'bs58'

const initialState = {
    peers: new Set(),
    postsAggregated: [],
    contentStore: new Map(),
    getAndStoreContent: () => {},
    putPost: () => {},
    revoke: () => {},
    attachmentIsLoading: {},

    postsMode: 'tag',
    opost: null,
    tag: 'd'
}

function copy(draft, action) {
    draft.postsAggregated = [...action.state.postsAggregated]
    draft.contentStore = new Map(action.state.contentStore)
    draft.peers = new Set(action.state.peers)
}

function handleUrl(draft) {
    draft.opost = null
    draft.tag = null
    const path = window.location.hash.match('#(.*)')[1].split('/')
    if (path[1] === '~') {
        draft.postsMode = 'tilde'
    } else if (bs58.decode(path[1]).length === 64) {
        draft.opost = draft.postsAggregated.find(post => post.pid === path[1])
        //TODO: or else!
        if (path[2] === 'direct') {
            if (path[3] && bs58.decode(path[3]).length === 64) {
                draft.postsMode = 'direct conversation'
                draft.opost2 = draft.postsAggregated.find(post => post.pid === path[3])
                draft.conversationId = path.slice(0, 4).join('/')
            } else {
                draft.postsMode = 'direct'
            }
        } else {
            draft.postsMode = 'thread'
        }
    } else {
        draft.postsMode = 'tag'
        draft.tag = path[1]
    }
}

function reducer(state = initialState, action) {
    console.log("RDCR", action)
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
                    handleUrl(draft)
                }
                break
            case 'init':
                copy(draft, action)
                //handleUrl(draft)
                draft.getAndStoreContent = action.state.getAndStoreContent
                draft.putPost = action.state.putPost
                draft.revoke = action.state.revoke
                break
        }
    })
    console.log(newState)
    return newState
}

const store = createStore(reducer)
export default store
