import { createStore } from 'redux'
import produce from 'immer'

const initialState = {
    posts: [],
    contentStore: new Map(),
    getAndStoreContent: () => {},
    fileIsLoading: {}
}

function reducer(state = initialState, action) {
    console.log("RDCR", action)
    const newState = produce(state, draft => {
        switch (action.type) {
            case 'file load start':
                draft.fileIsLoading[action.cid] = 'loading'
                break
            case 'file load failure':
                draft.fileIsLoading[action.cid] = 'fail'
                break
            case 'file load success':
                draft.fileIsLoading[action.cid] = 'loaded'
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
