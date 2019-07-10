import React from 'react'
import { connect } from 'react-redux'
import style from './index.css'
import Meta from './Meta.js'
import Sutra from './Sutra.js'
import { renderBody } from './utils.js'
import Attachments from './Attachments/'

/* copied and modified from v0 Posts.Post */

const SurahItem = ({surah, sutra, mini = false}) => <div>
    <div className={[
            'surah-item',
            ...(surah.result.revoked ? ['revoked'] : []),
            ...(surah.my ? ['my'] : [])
        ].map(name => style[name]).join(' ')}
    >
        <Meta {...{surah}} />

        {surah.result.revoked ? [] : [
            ...(surah.result.body ? [ <div className={style['body']} dangerouslySetInnerHTML={{__html: renderBody(surah)}} /> ] : []),
            ...(surah.result.attachments ? [<Attachments {...{attachments: surah.result.attachments}} />] : []),
        ]}
    </div>

    {!mini && sutra.length > 0 ? <Sutra {...{sutra, opid: surah.result.opid}} /> : []}
</div>

export default connect(
    (state, {surah}) => ({
        sutra: state.suwar.filter(curSurah => curSurah.result.opid === surah.pid)
    })
)(SurahItem)
