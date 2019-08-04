import { createStore, applyMiddleware } from 'redux'
import { createEpicMiddleware } from 'redux-observable'
import mayaReducer from './reducer.js'
import mayaEpic from './epic.js'
import mayaInitialState from './initialState.js'

import commonReducer from 'Common/store/reducer.js'
import commonEpic from 'Common/store/epic.js'
import commonInitialState from 'Common/store/initialState.js'
//import commonDispatch from 'Common/store/dispatch.js'

import surahReducer from 'Surah/store/reducer.js'
import surahEpic from 'Surah/store/epic.js'
import surahInitialState from 'Surah/store/initialState.js'

import { combineEpics } from 'redux-observable'

const logger = (state, action) => {
    console.log('RDCR', action)
    return state
}

/* combine things */
const initialState = Object.assign({}, commonInitialState, surahInitialState, mayaInitialState)
const reducer = (state = initialState, action) =>
    [mayaReducer, surahReducer, commonReducer]
        .reduce((state, reducer) => reducer(state, action), state)
const epic = combineEpics(commonEpic, surahEpic, mayaEpic)

/* create store */
const epicMiddleware = createEpicMiddleware()
const store = createStore(
    reducer,
    applyMiddleware(epicMiddleware)
)
epicMiddleware.run(epic)
//commonDispatch(store)

export default store
