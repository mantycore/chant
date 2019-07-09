import React from 'react'
import { connect } from 'react-redux'
import style from './Meta.css'

const Meta = ({surah, dispatch}) => <div className={style['meta']}>
    <span className={style['meta-link']}>
        <a href={`#/${surah.pid}`} >
            {surah.pid.substring(0, 8)} {new Date(surah.result.timestamp).toISOString() /*TODO: latest AND initial timestamp for modified posts*/}
        </a>
    </span>

    {surah.result.revoked ? ['POST REVOKED'] : [ //TODO: see history?
        ...(surah.my ? [
            <span className={style['action']} onClick={dispatch.update(surah)}>Update</span>,
            '\u00A0',
            <span className={style['action']} onClick={dispatch.revoke(surah)}>Revoke</span>
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
        revoke: surah => () => dispatch({type: 'react surah-item meta revoke', surah}),
        update: surah => () => dispatch({type: 'react surah-item meta update', surah})
            //if it is safe to pass post instead of pid?
    }})
)(Meta)
