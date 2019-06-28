import { createStore } from 'redux'
import produce from 'immer'

const initialState = {
    peers: new Set(),
    posts: [],
    contentStore: new Map(),
    getAndStoreContent: () => {},
    attachmentIsLoading: {}
}

function copy(draft, action) {
    draft.posts = [...action.state.posts]
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

            case 'update':
                copy(draft, action)
                break
            case 'init':
                copy(draft, action)
                draft.getAndStoreContent = action.state.getAndStoreContent
                break
        }
    })
    console.log(newState)
    return newState
}

const store = createStore(reducer)
export default store
