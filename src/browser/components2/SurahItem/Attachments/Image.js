import React from 'react'
import { connect } from 'react-redux'
import style from './Image.css'
import {binaryToUrl, format} from './utils.js'

const Image = ({attachment, content, status, dispatch}) => 
    status === 'loaded'
        ? <div>
            {content.payload.buffer
            ? <a href={binaryToUrl(content.payload.buffer, attachment.type)} download={attachment.name}>
                <img
                    src={binaryToUrl(content.payload.buffer, attachment.type)}
                    className={style.image}
                />
            </a>
            : `Error displaying content ${JSON.stringify(content)}`
            }
            <div style={{display: 'flex', justifyContent: 'flex-end', marginRight: 10}}>
                {content.replicated && <span>✆ {content.replicated}</span>} {
                    content.persisted && <span>✇ {content.persisted}</span>}
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
    (state, props) => {
        const content = state.poema.contents[props.attachment.cid]
        return { 
            content,
            status: content && content.status && content.status.isLoading
        }
    },
    dispatch => ({dispatch: {
        download: cid => () => dispatch({type: 'react surah-item/attachment download', cid})
    }})
)(Image)
