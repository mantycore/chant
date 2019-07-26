import React from 'react'
import { connect } from 'react-redux'
import style from './Image.css'
import {binaryToUrl, format} from './utils.js'

const Image = ({attachment, status, storedContent, dispatch}) => 
    status === 'loaded'
        ? <div>
            <a href={binaryToUrl(storedContent.payload.buffer, attachment.type)} download={attachment.name}>
                <img
                    src={binaryToUrl(storedContent.payload.buffer, attachment.type)}
                    className={style.image}
                />
            </a>
            <div style={{display: 'flex', justifyContent: 'flex-end', marginRight: 10}}>
                {storedContent.replicated && <span>✆ {storedContent.replicated}</span>} {
                    storedContent.persisted && <span>✇ {storedContent.persisted}</span>}
           </div>
        </div>
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
        storedContent: state.contentStore.has(props.attachment.cid)
            && state.contentStore.get(props.attachment.cid)
    }),
    dispatch => ({dispatch: {
        download: cid => () => dispatch({type: 'react surah-item/attachment download', cid})
    }})
)(Image)
