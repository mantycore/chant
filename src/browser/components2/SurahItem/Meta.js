import React from 'react'
import { connect } from 'react-redux'

const Meta = ({surah, dispatch}) => <div className={style['meta']}>
    <span className={style['meta-link']}>
        <a href={`#/${surah.pid}`} >
            {surah.pid.substring(0, 8)} {new Date(surah.result.timestamp).toISOString() /*TODO: latest AND initial timestamp for modified posts*/}
        </a>
    </span>

    {revoked ? ['POST REVOKED'] : [ //TODO: see history?
        ...(surah.my ? [
            <span className={style['action']} onClick={dispatch.update(surah, state)}>Update</span>,
            '\u00A0',
            <span className={style['action']} onClick={dispatch.revoke(surah.origin, state)}>Revoke</span>
        ] : []),
        '\u00A0',
        <span><a href={`#/${surah.pid}/direct`}>Direct</a></span>,
        '\u00A0',
        <span className={style['action']} onClick={() => { console.log(surah) }}>Dump</span>
    ]}
</div>

export default connect(
    state => ({}),
    dispatch => ({dispatch: {
        revoke: surah => () => dispatch({type: 'react surahitem meta revoke', surah}),
        update: surah => () => dispatch({type: 'react surahitem meta update', surah})
            //if it is safe to pass post instead of pid?
    }}
)(Meta)


