import React, {useState} from 'react'
import { connect } from 'react-redux'
import {
    selectPath,
    selectTags,
    selectSutraniByTag,
    selectSuwarBySutraPid,
    selectSurahByPid,
    selectRengashu,
    selectRenga
} from 'Browser/selectors/'
import style from './Maya.css'

import SuwarList from './SuwarList/'
import SurahItem from './SurahItem/'
import PostForm from './PostForm/'

import Splash from 'Browser/components/Splash.js'

const connector = connect(
    state => ({
        state,
    }),
    dispatch => ({dispatch: {
        updateSutra: pid => dispatch({type: 'react maya/sutra update', pid}),
        updateTag: tag => dispatch({type: 'react maya/tag update', tag}),
        rengashuList: () => dispatch({type: 'react maya rengashu-list'}),
        updateRenga: id => dispatch({type: 'react maya/renga update', id}),
        toggleTheme: () => dispatch({type: 'maya theme toggle'}),
    }})
)

const formatDate = date => {
    const now = new Date()
    const utc = date.toISOString().match(/^\d\d([^T]+)T(\d\d:\d\d)/)
    if (now - date < 1000 * 60 * 60 * 24) {
        return utc[2] 
    } else {
        return utc[1] 
    }
}

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

const SutraItem = connector(({sutra, highlighted, dispatch}) => {
    const latest = sutra[sutra.length - 1]
    return <div className={[
        style['sutra-item'],
        ...(highlighted ? [style['highlighted']] : [])
    ].join(' ')} onClick={() => dispatch.updateSutra(sutra[0].pid)}>
        <div style={{display: 'flex'}}>
            <strong style={{flexGrow: 1}}># {sutra[0].result.body && brief(sutra[0].result.body.text)}</strong><br/>
            <span style={{color: '#777'}}>{formatDate(new Date(latest.result.timestamp))}</span>
        </div>
        {sutra.length > 1 && <>
            {latest.my && "You: "}
            <span style={{color: '#777'}}>{latest.result.body && brief(latest.result.body.text)}</span>
        </>}
    </div>
})

//<span className={style['sutra-pid']}>#{sutra.pid.substring(0, 8)}</span>

const TagItem = connector(({tag, highlighted, dispatch}) =>
    <div className={[
        style['tag-item'],
        ...(highlighted ? [style['highlighted']] : [])
    ].join(' ')} onClick={() => dispatch.updateTag(tag[0])}>/{tag[0]}/</div>)

const RengaItem = connector(({renga, highlighted, dispatch}) => {
    const latest = renga.suwar[renga.suwar.length - 1]
    return (<div className={[
        style['sutra-item'],
        ...(highlighted ? [style['highlighted']] : [])
    ].join(' ')} onClick={() => dispatch.updateRenga(renga.id)}>
        <div style={{display: 'flex'}}>
            <strong style={{flexGrow: 1}}>@ {renga.suwar[0].result.body && brief(renga.suwar[0].result.body.text)}</strong><br/>
            <span style={{color: '#777'}}>{formatDate(new Date(latest.result.timestamp))}</span>
        </div>
        {latest.my && "You: "}
        <span style={{color: '#777'}}>{latest.result.body && brief(latest.result.body.text)}</span>
    </div>)
})

const Maya = ({state, dispatch}) => {
    const {mode, tag, sutraPid, rengaId, scrollTrigger} = selectPath(state)
    const rengaMode = mode === 'direct'
                   || mode === 'direct conversation'
                   || mode === 'directs list'
    //TODO: move to connector
    const tags = selectTags(state)
 
    const theme = state.maya.theme
    const toggleTheme = dispatch.toggleTheme
    const tagList = (
        <div className={style['tags-column']}>
            <div className={style['tags-list']}>
                <div className={[
                    style['tag-item'],
                    ...(rengaMode ? [style['highlighted']] : [])
                ].join(' ')} onClick={dispatch.rengashuList}>/@/</div>
                {tags.map(curTag => <TagItem {...{tag: curTag, highlighted: curTag[0] === tag}} />)}
            </div>
            <div>{JSON.stringify({mode, tag, sutraPid, rengaId, scrollTrigger})}</div>
            <div onClick={toggleTheme}>
                theme: {theme}
            </div>
        </div>
    )

    const peerCount = Object.values(state.mantra.peers).length
    const persistentPeersCount = Object.values(state.mantra.peers).filter(peer => peer.persistent).length
    const peerStatus = <span>
        {peerCount} {peerCount === 1 ? 'peer' : 'peers'} online ({persistentPeersCount} persistent)
    </span>

    if (state.surah.suwar.length === 0) {
        return <Splash />
    }

    if (rengaMode) { //todo: two different components?
        const rengashu = selectRengashu(state)
        let oSurah = null, suwar = null
        if (mode === 'direct') {
            oSurah = selectSurahByPid(state, sutraPid)
        } else if (rengaId) {
            [oSurah, suwar] = selectRenga(state, rengaId)
        }

        return <div className={[style['maya'], theme].join(' ')}>
            {tagList}
            <div className={style['tag-column']}>
                {/*<div className={style['tag-meta']} />*/}
                <div className={style['tag-sutrani-list']}>{
                    rengashu.map(renga => <RengaItem {...{renga, highlighted: renga.id === rengaId}} />)
                }</div>
            </div>
            <div className={style['sutra-column']}>
                <div className={style['sutra-meta']}>{peerStatus}</div>
                {/* special component for renga suwar? */}
                <SuwarList {...{origin: oSurah, suwar, scrollTrigger,}} />
                <PostForm />
            </div>
        </div>

    } else {
        const sutrani = selectSutraniByTag(state, tag)
        const suwar = selectSuwarBySutraPid(state, sutraPid)
        const oSurah = selectSurahByPid(state, sutraPid)


        return <div className={[style['maya'], theme].join(' ')}>
            {tagList}
            <div className={style['tag-column']}>
                {/*<div className={style['tag-meta']} />*/}
                <div className={style['tag-sutrani-list']}>{sutrani
                ? sutrani.map(sutra => <SutraItem {...{sutra, highlighted: sutra[0].pid === sutraPid}} />)
                : "" /*"Sutrani placeholder"*/
                }</div>
            </div>
            <div className={style['sutra-column']}>
                <div className={style['sutra-meta']}>{peerStatus}</div>
                <SuwarList {...{origin: oSurah, suwar, scrollTrigger}} />
                <PostForm />
            </div>
        </div>
    }

}

export default connector(Maya)
