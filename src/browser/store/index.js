import { createStore, applyMiddleware } from 'redux'
import { createEpicMiddleware } from 'redux-observable'
import reducer from './reducer.js'
import epic from './epic.js'

const epicMiddleware = createEpicMiddleware()

const store = createStore(
    reducer,
    applyMiddleware(epicMiddleware)
)

epicMiddleware.run(epic)

export default store
