import React from 'react'
import style from './index.css'
import Image from './Image.js'
import { format, binaryToUrl } from './utils.js'
import { connect } from 'react-redux'

//copied from v0 PostForm
const PureAttachment = ({attachment, content, dispatch}) => <p className={style['attachment']}>
    🗎 {[attachment.name, attachment.type, format(attachment.size)].map(field =>
        <span className={style['info-field']}>{field}</span>)}
    ({content && content.status && content.status.isLoading
        ? ({
            loaded: <a href={binaryToUrl(content.payload.buffer, attachment.type)} download={attachment.name} onClick={dispatch.save}>save</a>,
            loading: 'loading',
            failure: <span className={style['action']} onClick={dispatch.download}>failed to download, try again</span>
        }[content.status.isLoading])
        : <span className={style['action']} onClick={dispatch.download}>download</span>
    })
</p>

const Attachment = connect(
    (state, props) => ({
        content: state.poema.contents[props.attachment.cid]
    }),
    (dispatch, props) => ({dispatch: {
        download: () => dispatch({type: 'react surah-item/attachment download', cid: props.attachment.cid})
    }})
)(PureAttachment)

const Attachments = ({attachments}) => {
    let images = []
    let rest = []
    for (const attachment of attachments) {
        (attachment.type.startsWith('image/') ? images : rest).push(attachment)
    }
    return <div className={style.attachments}>
        {rest.map(attachment => <Attachment {...{attachment}} />)}
        {images.map(attachment => <Image {...{attachment}} />)}
        
    </div>
}
export default Attachments
