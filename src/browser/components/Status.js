import React from 'react'
import e from './createElement.js'
import { connect } from 'react-redux'

const Status = ({state}) => {
    const rengaCount = state.rengashu.filter(renga => renga.fresh).length
    return e('div', {id: 'status'}, [
        e('span', {}, e('a', {href: '#directs', style: {...(rengaCount > 0 ? {fontWeight: 'bold'} : {})}},
            ['Conversations', ...(rengaCount > 0 ? [` (${rengaCount})`] : [])])),
        '\u00A0',
        e('span', {}, [state.peers.size, ' peer(s) online'])
    ])
}

export default connect(state => ({state}))(Status)
