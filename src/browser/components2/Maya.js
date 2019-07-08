import React, {useState} from 'react'
import { connect } from 'react-redux'
import {
    selectTags,
    selectSutraniByTag,
    selectSuwarBySutra
} from 'Browser/selectors/'
import style from './Maya.css'

const connector = connect(
    state => ({
        state,
        newState: state.newState
    }),
    dispatch => ({dispatch: {
        updateSutra: pid => dispatch({type: 'react maya sutra update', pid}),
        updateTag: tag => dispatch({type: 'react maya tag update', tag}),
    }})
)

const Surah = connector(({post, state, newState, dispatch}) =>
    <div className="surah">{post.pid.substring(0, 8)} {post.result.body && post.result.body.text}</div>)

const Sutra = connector(({thread, state, newState, dispatch}) =>
    <div className="sutra" onClick={() => dispatch.updateThread(thread.pid)}>
        {thread.pid.substring(0, 8)}
        <br />
        {thread.result.body && thread.result.body.text.substring(0, 24)}
    </div>)

const Tag = connector(({tag, state, newState, dispatch}) =>
    <div onClick={() => dispatch.updateTag(tag[0])}>{tag[0]}</div>)

const Maya = ({state, newState, dispatch}) => {
    const {tag, threadPid} = newState.app

    const tags = selectTags(state)
    const sutrani = selectSutraniByTag(state, tag)
    const suwar = selectSuwarBySutraPid(state, sutraPid)

    return <div className={style.maya}>
        <div className={style.tags}>{tags.map(tag => <Tag {tag} />)}</div>
        <div className={style.sutrani}>{sutrani
            ? sutrani.map(sutra => <Sutra {sutra} />)
            : "Threads placeholder"
        }</div>
        <div className={style.sutra}>
            <div>OP</div> // thread meta/op
            <div className={style.suwar}>{suwar
                ? suwar.map(surah => <Surah {surah} />)
                : "Posts placeholder"
            }</div>
            <div>Post form</div>
        ])
    ])
}

export default connector(App)