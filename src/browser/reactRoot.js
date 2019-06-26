import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import e from './createElement.js'
import Posts from './posts.js'
import store from './store.js'

ReactDOM.render(
    e(Provider, {store},
        e(Posts)),
    document.getElementById('main'))

export { store }
