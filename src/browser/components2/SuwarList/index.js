import React, {useRef, useEffect} from 'react'
import { connect } from 'react-redux'
import SurahItem from 'Browser/components2/SurahItem/'
import style from 'Browser/components2/Maya.css' //todo: move to a separate style


const SuwarList = ({origin, scrollTrigger, suwar}) => {
	const scrollRef = useRef(null)
	useEffect(() => {
		const scrollDiv = scrollRef.current
		scrollDiv.scrollTop = scrollDiv.scrollHeight - scrollDiv.clientHeight
	}, [scrollTrigger])

	return <div className={style['sutra-suwar-list']} ref={scrollRef}>
	    {origin && <SurahItem {...{surah: origin, mini: true}} />}
	    {suwar
	        ? suwar.map(surah => <SurahItem {...{surah}} />)
	        : "" /*Suwar placeholder*/
	    }
	</div>
}

export default connect(
	state => ({scrollTrigger: state.newState.suwarList.scrollTrigger})
)(SuwarList)
