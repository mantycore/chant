import React, {useRef, useEffect} from 'react'
import { connect } from 'react-redux'
import SurahItem from 'Browser/components2/SurahItem/'
import style from 'Browser/components2/Maya.css' //todo: move to a separate style


const SuwarList = ({origin, suwar, scrollTrigger, autoScrollAllowed, dispatch}) => {
    const scrollRef = useRef(null)
    useEffect(() => {
        if (scrollTrigger && autoScrollAllowed) {
            const scrollDiv = scrollRef.current
            scrollDiv.scrollTop = scrollDiv.scrollHeight - scrollDiv.clientHeight
        }
    })

    function stopAutoScroll() {
        if (autoScrollAllowed) {
            dispatch.stopAutoScroll()
        }
    }
 
    return <div className={style['sutra-suwar-list']} ref={scrollRef} onScroll={stopAutoScroll}>
        {origin && <SurahItem {...{surah: origin, mini: true}} />}
        {suwar
            ? suwar.map(surah => <SurahItem {...{surah}} />)
            : "" /*Suwar placeholder*/
        }
    </div>
}

export default connect(
    (state, props) => ({autoScrollAllowed: state.newState.suwarList.autoScrollAllowed}),
    dispatch => ({dispatch: {
        stopAutoScroll: () => dispatch({type: 'maya suwarList stopAutoScroll'})
    }})
)(SuwarList)
