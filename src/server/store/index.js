import { createStore, applyMiddleware } from 'redux'
import { createEpicMiddleware } from 'redux-observable'
import termaReducer from './reducer.js'
import termaEpic from './epic.js'
import termaInitialState from './initialState.js'

import commonReducer from 'Common/store/reducer.js'
import commonEpic from 'Common/store/epic.js'
import commonInitialState from 'Common/store/initialState.js'

import { combineEpics } from 'redux-observable'

const logger = (state, action) => {
    console.log('RDCR', action)
    return state
}

/* combine things */
const initialState = Object.assign({}, commonInitialState, termaInitialState)
const reducer = (state = initialState, action) =>
    [logger, termaReducer, commonReducer]
        .reduce((state, reducer) => reducer(state, action), state)
const epic = combineEpics(commonEpic, termaEpic)

/* create store */
const epicMiddleware = createEpicMiddleware()
const store = createStore(
    reducer,
    applyMiddleware(epicMiddleware)
)
epicMiddleware.run(epic)
//commonDispatch(store)

export default store
