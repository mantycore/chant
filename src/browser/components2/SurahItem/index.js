import React from 'react'
import { connect } from 'react-redux'
import style from './index.css'

/* copied and modified from v0 Posts.Post */

const SurahItem = ({surah, sutra, ayat, mini = false}) =>
<div></div>
/*
    <div className={[
            'surah',
            ...(surah.result.revoked ? ['revoked'] : []),
            ...(surah.my ? ['my'] : [])
        ].map(name => style[name]).join(' ')}
    >
        <Meta {...{surah}} />

        {revoked ? [] : [
            ...(surah.result.body ? [ <div className={style['body']} dangerouslySetInnerHTML={{__html: renderBody(surah)}} /> ] : []),
            ...(surah.result.attachments ? [<Attachments {...{attachments: surah.result.attachments}} />] : []),
        ]}
    </div>

    {!mini && sutra.length > 0 ? <Sutra {...{sutra, opid: surah.result.opid}} /> : []}
</div>
*/
export default connect(
    (state, {surah}) => ({
        sutra: state.suwar.filter(curSurah => curSurah.result.opid === surah.pid)
    })
)
