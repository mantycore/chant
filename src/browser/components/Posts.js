import React, {useRef, useEffect} from 'react'
import { connect } from 'react-redux'
import MarkdownIt from 'markdown-it'
import style from './Posts.css'

//TODO: handle this in aggregate
import verify from 'Surah/ayah/verify.js'

const md = new MarkdownIt()

const format = size =>
    size > Math.pow(1024, 4)
    ? `${(size/Math.pow(1024, 4)).toLocaleString("en", {maximumFractionDigits: 1})} TiB`
    : size > Math.pow(1024, 3)
    ? `${(size/Math.pow(1024, 3)).toLocaleString("en", {maximumFractionDigits: 1})} GiB`
    : size > Math.pow(1024, 2)
    ? `${(size/Math.pow(1024, 2)).toLocaleString("en", {maximumFractionDigits: 1})} MiB`
    : size > 1024
    ? `${(size/1024).toLocaleString("en", {maximumFractionDigits: 1})} KiB`
    : `${size} bytes`;


const urlCreator = window.URL || window.webkitURL
/*const binaryToUrl = (binary, type) => {
    console.log(binary, type)
    const url = urlCreator.createObjectURL(new Blob([binary], {type}))
    console.log('URL', url)
}*/

function Uint8ToB64String(u8a){
  var CHUNK_SZ = 0x8000;
  var c = [];
  for (var i=0; i < u8a.length; i+=CHUNK_SZ) {
    c.push(String.fromCharCode.apply(null, u8a.subarray(i, i+CHUNK_SZ)));
  }
  return c.join("");
}

const binaryToUrl = (binary, type) => `data:${type};base64,${btoa(Uint8ToB64String(binary))}`

const Image = ({attachment, state, dispatch}) => 
    state.contentStore.has(attachment.cid)
        ? <img
            src={binaryToUrl(state.contentStore.get(attachment.cid).buffer, attachment.type)}
            className={style.image}
        />
        : <div
            onClick={dispatch.downloadAttachment(attachment.cid, state)}
            className={style['image-placeholder']}
        >
            <p>{attachment.type}</p>
            <p>{format(attachment.size)}</p>
            <p>{state.attachmentIsLoading[attachment.cid] === 'loading'
                ? 'Loading'
                : state.attachmentIsLoading[attachment.cid] === 'fail'
                ? 'Failed to load'
                : 'Click to load'
            }</p>
        </div>

const Attachments = ({attachments, state, dispatch}) =>
    <div className={style.attachments}>{attachments
        .filter(attachment => attachment.type === 'image/png' || attachment.type === 'image/jpeg')
        .map(attachment => <Image {...{attachment, state, dispatch}} />)
    }</div>


const mark = style['mark']
const genuine = style['genuine']
const counterfeit = style['counterfeit']

const renderBody = (surah, state) => {
    let html = md.render(surah.result.body.text)
    if (surah.result.ayat) {
        surah.result.ayat.filter(ayah => ayah.type === 'hand').forEach(ayah => {
            const original = state.poemata.find(psalm => psalm.pid === ayah.pid) // what if it is haiku?
            const from = surah.psalmoi.find(psalm => psalm.pid === ayah.from)
            const isGenuine = verify(from, ayah, original)
            if (isGenuine) {
                html = html.replace(new RegExp(`~${ayah.pid}`, 'g'), `<a href="#/${ayah.pid}" class="${mark} ${genuine}">$&</a>`)
            } else {
                html = html.replace(new RegExp(`~${ayah.pid}`, 'g'), `<a href="#/${ayah.pid}" class="${mark} ${counterfeit}">$&</a>`)
            }
        })
    }
    return html
}

const Post = ({surah, state, dispatch, mini = false, renga = null}) => {
    const updateProof = surah.result.proofs && surah.result.proofs.find(proof => proof.type === 'delete' || proof.type === 'put')
    const revoked = surah.result.revoked
    const thread = renga
        ? renga.suwar.slice(1)
        : state.suwar.filter(curSurah =>
            curSurah.result.opid === surah.pid)
    return <div>
        <div className={[
                'post',
                ...(revoked ? ['revoked'] : []),
                ...(surah.my ? ['my'] : [])
            ].map(name => style[name]).join(' ')}
        >
            <div className={style['meta']}>
                <span className={style['meta-link']}>
                    <a href={renga ? `#${renga.id}` : `#/${surah.pid}`} >
                        {surah.pid.substring(0, 8)} {new Date(surah.result.timestamp).toISOString() /*TODO: latest AND initial timestamp for modified posts*/}
                    </a>
                </span>

                {revoked ? ['POST REVOKED'] : [ //TODO: see history?
                    ...(surah.my ? [
                        <span className={style['action']} onClick={dispatch.update(surah, state)}>Update</span>,
                        '\u00A0',
                        <span className={style['action']} onClick={dispatch.revoke(surah.origin, state)}>Revoke</span>
                    ] : []),
                    '\u00A0',
                    <span><a href={`#/${surah.pid}/direct`}>Direct</a></span>,
                    '\u00A0',
                    <span className={style['action']} onClick={() => { console.log(surah) }}>Dump</span>
                ]}
            </div>

            {revoked ? [] : [
                ...(surah.result.body ? [ <div className={style['body']} dangerouslySetInnerHTML={{__html: renderBody(surah, state)}} /> ] : []),
                ...(surah.result.attachments ? [<Attachments {...{attachments: surah.result.attachments, state, dispatch}} />] : []),
            ]}
        </div>

        {!mini && thread.length > 0 ? [<div className={style['thread']}>{thread.length > 3 ? [
                <Post {...{surah: thread[0], state, dispatch, mini: 'true', renga}} />,
                <div className={style['more']}><a href={renga ? `#${renga.id}` : `#/${surah.pid}`}>{thread.length - 2} more post(s)</a></div>,
                <Post {...{surah: thread[thread.length-1], state, dispatch, mini: 'true', renga}} />
            ] : [thread.map(threadPost => <Post {...{surah: threadPost, state, dispatch, mini: 'true', renga}} />)]
            }</div>] : []}
    </div>
}

/* =========================================================================================================================================================== */

const Posts = ({state, dispatch}) => {
    const findReplies = surah => state.suwar.filter(curSurah =>
        curSurah.to && curSurah.to.filter(to => to.pid === surah.pid).length > 0)
    /*const findRepliesRecursively = post => {
        const replies = findReplies(post)
        return replies.concat(...replies.map(findRepliesRecursively))
    }*/
    const findRenga = id => state.suwar.filter(curSurah =>
        curSurah.conversationId === id)

    let suwar = [...state.suwar]
    let oSurah = null
    if (state.postsMode === 'directs list') {
        //roundabout due to conversations strucure, rewrite
        return <div id="posts">{state.rengashu.map(renga => {
            const first = renga.suwar.find(curSurah => curSurah.pid === renga.firstPid)
            return [<Post {...{post: first, state, dispatch, mini: false, renga}} />]
        })}</div>
    }
    if (state.postsMode === 'tilde') {
        suwar = suwar.filter(surah => !surah.result.opid && !surah.encrypted)
    } else if (state.postsMode === 'tag') {
        suwar = suwar.filter(surah => surah.result.tags && surah.result.tags.includes(state.tag))
    } else if (state.postsMode === 'thread') {
        oSurah = state.opost;
        suwar = state.suwar.filter(curSurah =>
            curSurah.result.opid === state.opost.pid)
    } else if (state.postsMode === 'direct') {
        oSurah = state.opost // sort
        suwar = []
        //posts = findReplies(oSurah)
    } else if (state.postsMode === 'direct conversation') {
        const renga = state.rengashu.find(curRenga => curRenga.id === state.conversationId)
        if (renga) {
            [oSurah, ...suwar] = renga.suwar
        } else {
            return <div className={style['error']}>Conversation is not found or is not accessible</div>
        }
    }
    //const ref = useRef(null)
    //useEffect((e) => { console.log(ref); ref.current.scrollTop = ref.current.scrollHeight - ref.current.clientHeight; }, [posts])
    return <div className={style['posts']}>
        {oSurah ? <div className={style['opost']}><Post {...{surah: oSurah, state, dispatch, mini: true}} /></div> : []}
        <div>{suwar.map(surah => <Post {...{surah, state, dispatch}} />)}</div>
    </div>
}

export default connect(
    state => ({state}),
    dispatch => ({dispatch: {
        downloadAttachment: (cid, state) => async () => {
            dispatch({type: 'attachment load start', cid})
            try {
                await state.getAndStoreContent(cid)
                dispatch({type: 'attachment load success', cid})
            } catch (error) {
                console.log(error);
                dispatch({type: 'attachment load fail', cid})
            }
        },
        revoke: (post, state) => () => window.confirm("Really revoke the post?") && state.revoke(post), //if it is safe to pass post instead of pid?
        update: (post, state) => () => dispatch({type: 'update post', post})
    }})
)(Posts)
