import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

//import App from './components/App.js'
import Maya from './components2/Maya.js'
import store from './store.js'

ReactDOM.render(
    <Provider {...{store}}><Maya/></Provider>,
    document.getElementById('main'))

export { store }
