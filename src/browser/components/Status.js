import React from 'react'
import { connect } from 'react-redux'

const Status = ({state}) => {
    const rengaCount = state.rengashu.filter(renga => renga.fresh).length
    return <div style={{color: '#888'}}>
        <span><a href="#directs" style={{...(rengaCount > 0 ? {fontWeight: 'bold'} : {})}}>
            Conversations{rengaCount > 0 ? [` (${rengaCount})`] : []}
        </a></span>
        {'\u00A0'}
        <span>{state.peers.size} peer(s) online</span>
    </div>
}

export default connect(state => ({state}))(Status)
