import React, {useState} from 'react'
import { connect } from 'react-redux'
import {
    selectTags,
    selectSutraniByTag,
    selectSuwarBySutraPid
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

const Surah = connector(({surah, state, newState, dispatch}) =>
    <div className={style['surah-item']}>{surah.pid.substring(0, 8)} {surah.result.body && surah.result.body.text}</div>)

const Sutra = connector(({sutra, state, newState, dispatch}) =>
    <div className={style['sutra-item']} onClick={() => dispatch.updateSutra(sutra.pid)}>
        {sutra.pid.substring(0, 8)}
        <br />
        {sutra.result.body && sutra.result.body.text.substring(0, 24)}
    </div>)

const Tag = connector(({tag, state, newState, dispatch}) =>
    <div className={style['tag-item']} onClick={() => dispatch.updateTag(tag[0])}>{tag[0]}</div>)

const Maya = ({state, newState, dispatch}) => {
    const {tag, sutraPid} = newState.maya

    const tags = selectTags(state)
    const sutrani = selectSutraniByTag(state, tag)
    const suwar = selectSuwarBySutraPid(state, sutraPid)

    return <div className={style['maya']}>
        <div className={style['maya-tags-list']}>{tags.map(tag => <Tag {...{tag}} />)}</div>
        <div className={style['tag-column']}>
            <div className={style['tag-meta']} />
            <div className={style['tag-sutrani-list']}>{sutrani
            ? sutrani.map(sutra => <Sutra {...{sutra}} />)
            : "Sutrani placeholder"
            }</div>
        </div>
        <div className={style['sutra-column']}>
            <div className={style['sutra-meta']}>OP</div>
            <div className={style['sutra-suwar-list']}>{suwar
                ? suwar.map(surah => <Surah {...{surah}} />)
                : "Suwar placeholder"
            }</div>
            <div>surah form</div>
        </div>
    </div>
}

export default connector(Maya)
