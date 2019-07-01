import React, {useRef, useEffect} from 'react'
import e from './createElement.js'
import { connect } from 'react-redux'
import MarkdownIt from 'markdown-it'

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

const binaryToUrl = (binary, type) => {
    console.log(binary, type)
    const url = `data:${type};base64,${btoa(Uint8ToB64String(binary))}`
    console.log('URL', url)
    return url
}

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
    e('div', {style: {display: 'flex', flexDirection: 'row', marginBottom: 16}}, attachments
        .filter(attachment => attachment.type === 'image/png' || attachment.type === 'image/jpeg')
        .map(attachment => e(Image, {attachment, state, dispatch})))

const Post = ({post, state, dispatch}) => {
    const updateProof = post.latest.proofs && post.latest.proofs.find(proof => proof.type === 'delete' || proof.type === 'put')
    const revoked = updateProof && updateProof.type === 'delete'
    return e('div', {className: [
            'post',
            ...(revoked ? ['revoked'] : []),
            ...(post.my ? ['my'] : [])
        ].join(' ')}, [
        e('div', {className: 'meta'}, [
            e('span', {style: {flexGrow: 1}}, 
                e('a', {
                    href: `#/${post.pid}`
                }, [
                    post.pid.substring(0, 8),
                    ' ',
                    new Date(post.latest.timestamp).toISOString() //TODO: latest AND initial timestamp for modified posts
                ])),
            ...(revoked ? ['POST REVOKED'] : [ //TODO: see history?
                ...(post.my ? [
                    'Update',
                    '\u00A0',
                    e('span', {onClick: dispatch.revoke(post.origin, state)}, 'Revoke'),
                ] : []),
                '\u00A0',
                e('span', {}, 'Direct')
            ])
        ]),
        ...(revoked ? [] : [
            ...(post.latest.body ? [e('div', {className: 'body', dangerouslySetInnerHTML: {__html: md.render(post.latest.body.text)}})] : []),
            ...(post.latest.attachments ? [e(Attachments, {attachments: post.latest.attachments, state, dispatch})] : [])
        ])
    ])
}

const Posts = ({state, dispatch}) => {
    let posts = [...state.postsAggregated].reverse()
    let oPost = null
    if (state.postsMode === 'tag') {
        posts = posts.filter(post => post.latest.tags && post.latest.tags.includes(state.tag))
    } else if (state.postsMode === 'thread') {
        oPost = state.opost;
        posts = state.postsAggregated.filter(post =>
            post.latest.opid === state.opost.pid)
    }
    console.log(oPost, posts);
    //const ref = useRef(null)
    //useEffect((e) => { console.log(ref); ref.current.scrollTop = ref.current.scrollHeight - ref.current.clientHeight; }, [posts])
    return e('div', {id: 'posts'}, [
        ...(oPost ? [e('div', {id: 'opost'}, e(Post, {post: oPost, state, dispatch}))] : []),
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
        revoke: (post, state) => () => state.revoke(post) //if it is safe to pass post instead of pid?
    }})
)(Posts)
