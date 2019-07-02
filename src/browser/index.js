import PeerRelay from 'peer-relay'
import messageHandler from 'Common/messageHandler.js'
import { store } from './reactRoot.js'
import browserCrypto from './browserCrypto.js'

const state = {
    pr: new PeerRelay({bootstrap: ['ws://localhost:7001']}),
    isServerNode: false
}

messageHandler(state)

window.chant = state

const secretCode = localStorage.get('Secret code')
if (!secretCode) {
    state.initiation = true
    state.secretCode = browserCrypto.pass()
} else {
    state.secretCode = secretCode
}

store.dispatch({type: 'init', state})
state.onStateChange(({type, payload}) => store.dispatch({type: 'update', state, mhType: type, mhPayload: payload}))
window.addEventListener('hashchange', (event) =>
    store.dispatch({type: 'hashchange', event}))
