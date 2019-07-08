import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import e from './components/createElement.js'
import App from './components/App.js'
//import Maya from './components2/Maya.js'
import store from './store.js'

ReactDOM.render(
    e(Provider, {store},
        e(App)),
    document.getElementById('main'))

export { store }
