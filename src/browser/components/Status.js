import React from 'react'
import e from './createElement.js'
import { connect } from 'react-redux'

const Status = ({state}) => {
    const conversationsCount = state.conversations.filter(c => c.fresh).length
    return e('div', {id: 'status'}, [
        e('span', {}, e('a', {href: '#directs', style: {...(conversationsCount > 0 ? {fontWeight: 'bold'} : {})}},
            ['Conversations', ...(conversationsCount > 0 ? [` (${conversationsCount})`] : [])])),
        '\u00A0',
        e('span', {}, [state.peers.size, ' peer(s) online'])
    ])
}

export default connect(state => ({state}))(Status)
