import React from 'react'
import { connect } from 'react-redux'
import style from './Image.css'
import {binaryToUrl, format} from './utils.js'

const Image = ({attachment, status, buffer, dispatch}) =>
    status === 'loaded'
        ? <img
            src={binaryToUrl(buffer, attachment.type)}
            className={style.image}
        />
        : <div
            onClick={dispatch.download(attachment.cid)}
            className={style['image-placeholder']}
        >
            <p>{attachment.type}</p>
            <p>{format(attachment.size)}</p>
            <p>{status === 'loading'
                ? 'Loading'
                : status === 'fail'
                ? 'Failed to load'
                : 'Click to load'
            }</p>
        </div>

export default connect(
    (state, props) => ({
        status: state.contentStore.has(props.attachment.cid)
            ? 'loaded'
            : state.attachmentIsLoading[props.attachment.cid],
        buffer: state.contentStore.has(props.attachment.cid)
            && state.contentStore.get(props.attachment.cid).buffer
    }),
    dispatch => ({dispatch: {
        download: cid => () => dispatch({type: 'react surah-item/attachment download', cid})
    }})
)(Image)
