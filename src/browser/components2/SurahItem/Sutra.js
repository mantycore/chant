import React from 'react'
import { connect } from 'react-redux'
import style from './Sutra.css'
import SurahItem from './index.js'

export default ({sutra, opid}) => thread.length > 3
? <>
    <SurahItem {...{surah: sutra[0], mini: 'true'}} />
    <div className={style['more']}><a href={`#/${opid}`}>{sutra.length - 2} more post(s)</a></div>
    <SurahItem {...{surah: sutra[sutra.length-1], mini: 'true'}} />
</>
: sutra.map(surah => <SurahItem {...{surah, mini: 'true'}} />)
