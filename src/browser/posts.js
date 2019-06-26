import React from 'react'
import e from './createElement.js'
import { connect } from 'react-redux'

const Posts = ({state, dispatch}) =>
    (console.log('state', state),
    e('div', null, state.posts.map(post => e('div', null, [
        e('p', {style: {fontSize: 10}}, post.pid),
        e('p', null, post.body),
        ...(post.files ? [

            e('p', {style: {display: 'flex', flexDirection: 'row'}}, post.files
                .filter(file => file.type === 'image/png' || file.type === 'image/jpeg')
                .filter(file => state.contentStore.has(file.cid))
                .map(file => e('img', {
                    src: state.contentStore.get(file.cid).dataURL,
                    style: {maxHeight: 400, paddingRight: 10} // todo: find a cleaner way to align them
                })))

        ] : [])
    ]))))

export default connect(
    state => ({state}),
    dispatch => ({dispatch})
)(Posts)
