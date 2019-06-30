import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import e from './components/createElement.js'
import App from './components/App.js'
import store from './store.js'

ReactDOM.render(
    e(Provider, {store},
        e(App)),
    document.getElementById('main'))

export { store }
