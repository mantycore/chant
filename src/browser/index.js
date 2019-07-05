import PeerRelay from 'peer-relay'
import messageHandler from 'Common/messageHandler.js'
import { store } from './reactRoot.js'
import { pass } from './browserCrypto.js'

const state = {
    pr: new PeerRelay({bootstrap: ['wss://chant.anoma.li:7001']}),
    isServerNode: false
}

messageHandler(state)

window.chant = state

const secretCode = localStorage.getItem('Secret code')
if (!secretCode) {
    state.initiation = true
    state.secretCode = pass()
} else {
    state.crypto.setPassphrase(secretCode)
    state.secretCode = secretCode
}

store.dispatch({type: 'init', state})
state.onStateChange(({type, payload}) => 
    store.dispatch({type: 'update', state, mhType: type, mhPayload: payload}))
window.addEventListener('hashchange', (event) =>
    store.dispatch({type: 'hashchange', event}))
