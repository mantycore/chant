import React from 'react'
import e from './createElement.js'
import { connect } from 'react-redux'

const Status = ({state}) =>
    e('div', null, [state.peers.size, ' ', 'peer(s) online'])

export default connect(state => ({state}))(Status)
