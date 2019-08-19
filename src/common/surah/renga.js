import { cloneDeep, whenAvailable } from './util.js'

const addSurahToRenga = async (
    poema,
    psalm,
    surah,
    suwar,
    rengashu,
    state$
) => {
    let renga = null
    if (surah.encrypted && surah.encrypted !== 'unknown') {
        if (!psalm.conversationId) { //this is the second post (first reply) in the conversation
            const selectOSurah = state => state.surah.suwar.find(curSurah => curSurah.pid === poema.to[0].pid)
            const oSurah = await whenAvailable(state$, selectOSurah)
            // TODO:  this must be changed if the multiperson conversation will be implemented
            // possibly to an array of oSuwar?
            renga = {
                id: `/${oSurah.pid}/direct/${surah.pid}`,
                firstPid: oSurah.pid,
                secondPid: surah.pid,
                suwar: [oSurah, surah],
                latest: surah.result.timestamp,
                fresh: surah.encrypted === 'their'
            }
            console.log(renga)
            //if (!rengashu.find(curRenga => curRenga.id === renga.id)) {
                //rengashu.push(renga)
            //} // or else?
        } else {
            const selectRenga = state => state.surah.rengashu.find(curRenga => curRenga.id === psalm.conversationId)
            renga = cloneDeep(await whenAvailable(state$, selectRenga))
            if (!renga) {
                //possibly error; and is not possible with whenAvailable
                const [_, first, __, second] = psalm.conversationId.split('/')
                renga = {id: psalm.conversationId, suwar: [], latest: 0, fresh: true, firstPid, secondPid, headless: true}
                console.log('Headless conversation', renga)
                rengashu.push(renga)
            }
            if (!renga.suwar.includes(surah)) {
                renga.suwar.push(surah)
                renga.suwar.sort(((a, b) => new Date(a.origin.timestamp) - new Date(b.origin.timestamp)))
                renga.latest = renga.suwar[renga.suwar.length - 1].result.timestamp // NB
                renga.fresh = surah.encrypted === 'their'
            }
        }
    }
    return renga
}

export default addSurahToRenga
