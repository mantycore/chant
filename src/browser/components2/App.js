import React, {useState} from 'react'
import e from 'Browser/components/createElement.js'
import { connect } from 'react-redux'
import {
    selectTags,
    selectThreadsByTag,
    selectPostsByThread
} from 'Browser/selectors/'
import style from './App.css'

const connector = connect(
    state => ({
        state,
        newState: state.newState
    }),
    dispatch => ({dispatch: {
        updateThread: pid => dispatch({type: 'app thread update', pid}),
        updateTag: tag => dispatch({type: 'app tag update', tag}),
    }})
)

const Post = connector(({post, state, newState, dispatch}) =>
    e('div', {style: {marginBottom: '3em'}},
    [post.pid.substring(0, 8), ' ', post.result.body && post.result.body.text]))

const Thread = connector(({thread, state, newState, dispatch}) =>
    e('div', {onClick: () => dispatch.updateThread(thread.pid), style: {marginBottom: '3em'}},
    [thread.pid.substring(0, 8), e('br'), thread.result.body && thread.result.body.text.substring(0, 24)]))

const Tag = connector(({tag, state, newState, dispatch}) =>
    e('div', {onClick: () => dispatch.updateTag(tag[0])}, tag[0]))

const App = ({state, newState, dispatch}) => {
    const {tag, threadPid} = newState.app

    const tags = selectTags(state)
    const threads = selectThreadsByTag(state, tag)
    const posts = selectPostsByThreadPid(state, threadPid)

    return e('div', {className: style.chant}, [
        e('div', {className: style.tags}, tags.map(tag => e(Tag, {tag}))),
        e('div', {className: style.threads}, threads ? threads.map(thread => e(Thread, {thread})) : "Threads placeholder"),
        e('div', {className: style.thread}, [
            e('div', {}, "OP"), // thread meta/op
            e('div', {className: style.posts}, posts ? posts.map(post => e(Post, {post})) : "Posts placeholder"),
            e('div', {}, "Post form") // post form
        ])
    ])
}

export default connector(App)