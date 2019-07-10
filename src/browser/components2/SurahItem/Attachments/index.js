import React from 'react'
import style from './index.css'
import Image from './Image.js'

const Attachments = ({attachments}) =>
<div className={style.attachments}>{attachments
    .filter(attachment => attachment.type === 'image/png' || attachment.type === 'image/jpeg')
    .map(attachment => <Image {...{attachment}} />)
}</div>

export default Attachments
