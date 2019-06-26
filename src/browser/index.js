import PeerRelay from 'peer-relay'
import messageHandler from 'Common/messageHandler.js'
import { store } from './reactRoot.js'
import handleUpload from './upload.js'

const state = {
    pr: new PeerRelay({bootstrap: ['ws://localhost:7001']})
}

messageHandler(state)

Object.assign(window, state)
store.dispatch({type: 'init', state})
state.onStateChange(() => store.dispatch({type: 'update', state}))

handleUpload(state)
