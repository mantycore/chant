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

const ImageFile = ({file, state, dispatch}) =>
    state.contentStore.has(file.cid)
        ? e('img', {
            src: binaryToUrl(state.contentStore.get(file.cid).buffer, file.type),
            style: {maxHeight: 400, paddingRight: 10} // todo: find a cleaner way to align them
        })
        : e('div', {
            onClick: dispatch.downloadFile(file.cid, state),
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
            e('p', null, file.type),
            e('p', null, format(file.size)),
            e('p', null, state.fileIsLoading[file.cid] === 'loading'
                ? 'Loading'
                : state.fileIsLoading[file.cid] === 'fail'
                ? 'Failed to load'
                : 'Click to load')
        ])

const Files = ({files, state, dispatch}) =>
    e('p', {style: {display: 'flex', flexDirection: 'row'}}, files
        .filter(file => file.type === 'image/png' || file.type === 'image/jpeg')
        .map(file => e(ImageFile, {file, state, dispatch})))

const Post = ({post, state, dispatch}) =>
    e('div', null, [
        e('p', {style: {fontSize: 10}}, post.pid),
        e('p', null, post.body),
        ...(post.files ? [e(Files, {files: post.files, state, dispatch})] : [])
    ])

const Posts = ({state, dispatch}) =>
    e('div', null, state.posts.map(post => e(Post, {post, state, dispatch})))

export default connect(
    state => ({state}),
    dispatch => ({dispatch: {
        downloadFile: (cid, state) => async () => {
            dispatch({type: 'file load start', cid})
            try {
                await state.getAndStoreContent(cid)
                dispatch({type: 'file load success', cid})
            } catch (error) {
                console.log(error);
                dispatch({type: 'file load fail', cid})
            }
        }
    }})
)(Posts)
