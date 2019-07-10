import React, {useState} from 'react'
import { connect } from 'react-redux'
import {
    selectTags,
    selectSutraniByTag,
    selectSuwarBySutraPid,
    selectSurahByPid
} from 'Browser/selectors/'
import style from './Maya.css'

import SuwarList from './SuwarList/'
import SurahItem from './SurahItem/'
import PostForm from './PostForm/'

const connector = connect(
    state => ({
        state,
        newState: state.newState
    }),
    dispatch => ({dispatch: {
        updateSutra: pid => dispatch({type: 'react maya/sutra update', pid}),
        updateTag: tag => dispatch({type: 'react maya/tag update', tag}),
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

const SutraItem = connector(({sutra, highlighted, dispatch}) =>
    <div className={[
        style['sutra-item'],
        ...(highlighted ? [style['highlighted']] : [])
    ].join(' ')} onClick={() => dispatch.updateSutra(sutra.pid)}>
        # {sutra.result.body && brief(sutra.result.body.text)}
    </div>)

//<span className={style['sutra-pid']}>#{sutra.pid.substring(0, 8)}</span>

const TagItem = connector(({tag, highlighted, dispatch}) =>
    <div className={[
        style['tag-item'],
        ...(highlighted ? [style['highlighted']] : [])
    ].join(' ')} onClick={() => dispatch.updateTag(tag[0])}>/{tag[0]}/</div>)

const Maya = ({state, newState, dispatch}) => {
    const {tag, sutraPid} = newState.maya

    //TODO: move to connector
    const tags = selectTags(state)
    if (tags) {
        tags.sort((a, b) => b[1] - a[1])
    }
    const sutrani = selectSutraniByTag(state, tag)
    if (sutrani) {
        sutrani.sort((oSurahA, oSurahB) => {
            const suwarA = [oSurahA, ...selectSuwarBySutraPid(state, oSurahA.pid)]
            const suwarB = [oSurahB, ...selectSuwarBySutraPid(state, oSurahB.pid)]
            return suwarB[suwarB.length - 1].origin.timestamp - suwarA[suwarA.length - 1].origin.timestamp
        })
    }
    const suwar = selectSuwarBySutraPid(state, sutraPid)
    const oSurah = selectSurahByPid(state, sutraPid)

    return <div className={style['maya']}>
        <div className={style['maya-tags-list']}>{tags.map(curTag => <TagItem {...{tag: curTag, highlighted: curTag[0] === tag}} />)}</div>
        <div className={style['tag-column']}>
            {/*<div className={style['tag-meta']} />*/}
            <div className={style['tag-sutrani-list']}>{sutrani
            ? sutrani.map(sutra => <SutraItem {...{sutra, highlighted: sutra.pid === sutraPid}} />)
            : "" /*"Sutrani placeholder"*/
            }</div>
        </div>
        <div className={style['sutra-column']}>
            {/*<div className={style['sutra-meta']}>OP</div>*/}
            <SuwarList {...{origin: oSurah, suwar}} />
            <PostForm />
        </div>
    </div>
}

export default connector(Maya)
