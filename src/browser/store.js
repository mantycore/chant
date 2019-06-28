import { createStore } from 'redux'
import produce from 'immer'

const initialState = {
    posts: [],
    contentStore: new Map(),
    getAndStoreContent: () => {},
    attachmentIsLoading: {}
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
                draft.posts = [...action.state.posts]
                draft.contentStore = new Map(action.state.contentStore)
                break
            case 'init':
                draft.posts = [...action.state.posts]
                draft.contentStore = new Map(action.state.contentStore)
                draft.getAndStoreContent = action.state.getAndStoreContent
                break
        }
    })
    console.log(newState)
    return newState
}

const store = createStore(reducer)
export default store
