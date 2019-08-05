import { store } from './reactRoot.js'
import { pass } from './browserCrypto.js'

const state = {
    // 'wss://chant.anoma.li:7001'
    prOptions: {bootstrap: ['ws://localhost:7001']},
    isServerNode: false
}

const secretCode = localStorage.getItem('Secret code')
if (!secretCode) {
    state.initiation = true
    state.secretCode = pass()
} else {
    //state.crypto.setPassphrase(secretCode)
    state.secretCode = secretCode
}

store.dispatch({type: 'init', state})
store.dispatch({type: 'mantra init'})
window.store = store
