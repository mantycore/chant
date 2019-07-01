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

            case 'hashchange': {
                draft.opost = null
                draft.tag = null
                const path = window.location.hash.match('#(.*)')[1].split('/')
                if (path[1] === '~') {
                    draft.postsMode = 'tilde'
                } else if (bs58.decode(path[1]).length === 64) {
                    draft.postsMode = 'thread'
                    draft.opost = state.postsAggregated.find(post => post.pid === path[1])
                    //TODO: or else!
                } else {
                    draft.postsMode = 'tag'
                    draft.tag = path[1]
                }
                break
            }

            case 'update':
                copy(draft, action)
                break
            case 'init':
                copy(draft, action)
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
