import React, {useRef, useEffect} from 'react'
import e from './createElement.js'
import { connect } from 'react-redux'
import MarkdownIt from 'markdown-it'
import { Buffer } from 'buffer'
import bs58 from 'bs58'
import crypto from 'Common/crypto.js'
import asBuffer from 'Psalm/asBuffer.js'
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
        ? e('img', {
            src: binaryToUrl(state.contentStore.get(attachment.cid).buffer, attachment.type),
            style: {maxHeight: 400, paddingRight: 10} // todo: find a cleaner way to align them
        })
        : e('div', {
            onClick: dispatch.downloadAttachment(attachment.cid, state),
            style: {
                height: 400,
                width: 300,
                marginRight: 10,
                backgroundColor: '#aaa',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            }
        },
        [
            e('p', null, attachment.type),
            e('p', null, format(attachment.size)),
            e('p', null, state.attachmentIsLoading[attachment.cid] === 'loading'
                ? 'Loading'
                : state.attachmentIsLoading[attachment.cid] === 'fail'
                ? 'Failed to load'
                : 'Click to load')
        ])

const Attachments = ({attachments, state, dispatch}) =>
    (<div className={style.attachments}>{attachments
        .filter(attachment => attachment.type === 'image/png' || attachment.type === 'image/jpeg')
        .map(attachment => e(Image, {attachment, state, dispatch}))}</div>)

const renderBody = (post, state) => {
    let html = md.render(post.result.body.text)
    if (post.result.ayat) {
        post.result.ayat.filter(proof => proof.type === 'hand').forEach(proof => {
            const original = state.posts.find(p => p.pid === proof.pid)
            const from = state.posts.find(p => p.pid === proof.from)
            const genuine = verify(from, proof, original)
            if (genuine) {
                html = html.replace(new RegExp(`~${proof.pid}`, 'g'), `<a href="#/${proof.pid}" class="mark genuine">$&</a>`)
            } else {
                html = html.replace(new RegExp(`~${proof.pid}`, 'g'), `<a href="#/${proof.pid}" class="mark counterfeit">$&</a>`)
            }
        })
    }
    return html
}

const Post = ({post, state, dispatch, mini = false, renga = null}) => {
    const updateProof = post.result.proofs && post.result.proofs.find(proof => proof.type === 'delete' || proof.type === 'put')
    const revoked = post.result.revoked
    const thread = renga
        ? renga.suwar.slice(1)
        : state.suwar.filter(curSurah =>
            curSurah.result.opid === post.pid)
    return e('div', {}, [
        e('div', {className: [
                'post',
                ...(revoked ? ['revoked'] : []),
                ...(post.my ? ['my'] : [])
            ].join(' ')}, [
            e('div', {className: 'meta'}, [
                e('span', {style: {flexGrow: 1}}, 
                    e('a', {
                        href: renga ? `#${renga.id}` : `#/${post.pid}`
                    }, [
                        post.pid.substring(0, 8),
                        ' ',
                        new Date(post.result.timestamp).toISOString() //TODO: latest AND initial timestamp for modified posts
                    ])),
                ...(revoked ? ['POST REVOKED'] : [ //TODO: see history?
                    ...(post.my ? [
                        e('span', {className: 'action', onClick: dispatch.update(post, state)}, 'Update'),
                        '\u00A0',
                        e('span', {className: 'action', onClick: dispatch.revoke(post.origin, state)}, 'Revoke'),
                    ] : []),
                    '\u00A0',
                    e('span', {}, e('a', {href: `#/${post.pid}/direct`}, 'Direct')),
                    '\u00A0',
                    e('span', {className: 'action', onClick: () => { console.log(post) }}, 'Dump')
                ])
            ]),
            ...(revoked ? [] : [
                ...(post.result.body ? [e('div', {className: 'body', dangerouslySetInnerHTML: {__html: renderBody(post, state)}})] : []),
                ...(post.result.attachments ? [e(Attachments, {attachments: post.result.attachments, state, dispatch})] : []),
            ])
        ]),
        ...(!mini && thread.length > 0 ? [e('div', {className: 'thread'}, thread.length > 3 ? [
                e(Post, {post: thread[0], state, dispatch, mini: 'true', renga}),
                e('div', {className: 'more'}, e('a', {
                    href: renga ? `#${renga.id}` : `#/${post.pid}`
                }, `${thread.length - 2} more post(s)`)),
                e(Post, {post: thread[thread.length-1], state, dispatch, mini: 'true', renga}),
            ] : [thread.map(threadPost => e(Post, {post: threadPost, state, dispatch, mini: 'true', renga}))]
            )] : [])
    ])
}



const Posts = ({state, dispatch}) => {
    const findReplies = post => state.suwar.filter(curSurah =>
        curSurah.to && curSurah.to.filter(to => to.pid === post.pid).length > 0)
    /*const findRepliesRecursively = post => {
        const replies = findReplies(post)
        return replies.concat(...replies.map(findRepliesRecursively))
    }*/
    const findRenga = id => state.suwar.filter(curSurah =>
        curSurah.conversationId === id)

    let posts = [...state.suwar]
    let oPost = null
    if (state.postsMode === 'directs list') {
        //roundabout due to conversations strucure, rewrite
        return e('div', {id: 'posts'}, state.rengashu.map(renga => {
            const first = renga.suwar.find(curSurah => curSurah.pid === renga.firstPid)
            return [
                e(Post, {post: first, state, dispatch, mini: false, renga}),
            ]
        }))
    }
    if (state.postsMode === 'tilde') {
        posts = posts.filter(post => !post.result.opid && !post.encrypted)
    } else if (state.postsMode === 'tag') {
        posts = posts.filter(post => post.result.tags && post.result.tags.includes(state.tag))
    } else if (state.postsMode === 'thread') {
        oPost = state.opost;
        posts = state.suwar.filter(curSurah =>
            curSurah.result.opid === state.opost.pid)
    } else if (state.postsMode === 'direct') {
        oPost = state.opost // sort
        posts = []
        //posts = findReplies(oPost)
    } else if (state.postsMode === 'direct conversation') {
        const renga = state.rengashu.find(curRenga => curRenga.id === state.conversationId)
        if (renga) {
            [oPost, ...posts] = renga.suwar
        } else {
            return e('div', {id: 'error'}, "Conversation is not found or is not accessible")
        }
    }
    //const ref = useRef(null)
    //useEffect((e) => { console.log(ref); ref.current.scrollTop = ref.current.scrollHeight - ref.current.clientHeight; }, [posts])
    return e('div', {id: 'posts'}, [
        ...(oPost ? [e('div', {id: 'opost'}, e(Post, {post: oPost, state, dispatch, mini: true}))] : []),
        e('div', {}, posts.map(post => e(Post, {post, state, dispatch})))
    ])
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
