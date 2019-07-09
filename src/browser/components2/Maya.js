import React, {useState} from 'react'
import { connect } from 'react-redux'
import {
    selectTags,
    selectSutraniByTag,
    selectSuwarBySutraPid,
    selectSurahByPid
} from 'Browser/selectors/'
import style from './Maya.css'

import SurahItem from './SurahItem/'

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

//const SurahItem = connector(({surah}) => <div>{surah.result.body && surah.result.body.text}</div>)
const brief = text => {
    let result = text
    /*let newLineIndex = text.indexOf('\n\n')
    if (newLineIndex !== -1) {
        result = result.substring(0, newLineIndex)
    }*/
    let endOfSentenceIndex = text.indexOf(/[.?!]/)
    if (endOfSentenceIndex !== -1) {
        result = result.substring(0, endOfSentenceIndex + 1)
    }
    let result2 = result.substring(0, 64)
    if (result.length !== result2.length) {
        result2 += "…"
    }
    return result2
}

const SutraItem = connector(({sutra, state, newState, dispatch}) =>
    <div className={style['sutra-item']} onClick={() => dispatch.updateSutra(sutra.pid)}>
        <span className={style['sutra-pid']}>#{sutra.pid.substring(0, 8)}</span> {sutra.result.body && brief(sutra.result.body.text)}
    </div>)

const TagItem = connector(({tag, state, newState, dispatch}) =>
    <div className={style['tag-item']} onClick={() => dispatch.updateTag(tag[0])}>/{tag[0]}/</div>)

const Maya = ({state, newState, dispatch}) => {
    const {tag, sutraPid} = newState.maya

    //TODO: move to connector
    const tags = selectTags(state)
    const sutrani = selectSutraniByTag(state, tag)
    if (sutrani) {
        sutrani.sort((a, b) => {
            const suwarA = selectSuwarBySutraPid(a) || [{origin: {timestamp: new Date().valueOf()}}]
            const suwarB = selectSuwarBySutraPid(b) || [{origin: {timestamp: new Date().valueOf()}}]
            return suwarA[suwarA.length - 1].origin.timestamp - suwarB[suwarB.length - 1].origin.timestamp 
        })
    }
    const suwar = selectSuwarBySutraPid(state, sutraPid)
    const oSurah = selectSurahByPid(state, sutraPid)

    return <div className={style['maya']}>
        <div className={style['maya-tags-list']}>{tags.map(tag => <TagItem {...{tag}} />)}</div>
        <div className={style['tag-column']}>
            {/*<div className={style['tag-meta']} />*/}
            <div className={style['tag-sutrani-list']}>{sutrani
            ? sutrani.map(sutra => <SutraItem {...{sutra}} />)
            : "" /*"Sutrani placeholder"*/
            }</div>
        </div>
        <div className={style['sutra-column']}>
            {/*<div className={style['sutra-meta']}>OP</div>*/}
            <div className={style['sutra-suwar-list']}>
                {oSurah && <SurahItem {...{surah: oSurah, mini: true}} />}
                {suwar
                    ? suwar.map(surah => <SurahItem {...{surah}} />)
                    : "" /*Suwar placeholder*/
                }
            </div>
            <div>surah form</div>
        </div>
    </div>
}

export default connector(Maya)
