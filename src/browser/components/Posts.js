import React from 'react'
import e from './createElement.js'
import { connect } from 'react-redux'

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
                paddingRight: 10,
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
    e('p', {style: {display: 'flex', flexDirection: 'row'}}, attachments
        .filter(attachment => attachment.type === 'image/png' || attachment.type === 'image/jpeg')
        .map(attachment => e(Image, {attachment, state, dispatch})))

const Post = ({post, state, dispatch}) =>
    e('div', null, [
        e('p', {style: {fontSize: 12}}, [
            e('span', {style: {fontFamily: 'monospace'}}, post.pid.substring(0, 8)),
            ' ',
            e('span', null, new Date(post.timestamp).toISOString())
        ]),
        e('p', null, post.body.text),
        ...(post.attachments ? [e(Attachments, {attachments: post.attachments, state, dispatch})] : [])
    ])

const Posts = ({state, dispatch}) =>
    e('div', {id: 'posts'}, [
        e('div', null, state.posts.map(post => e(Post, {post, state, dispatch})))
    ])

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
        }
    }})
)(Posts)
