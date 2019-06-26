import { createStore } from 'redux'

const initialState = {
    posts: [],
    contentStore: new Map()
}

function reducer(state = initialState, action) {
    console.log("RDCR", action)
    switch (action.type) {
        case 'init':
        case 'update':
            return {
                posts: action.state.posts,
                contentStore: action.state.contentStore
            }
        default:
            return state
    }
}

const store = createStore(reducer)
export default store
