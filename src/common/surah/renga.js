const addSurahToRenga = (
    payload,
    psalm,
    surah,
    suwar,
    rengashu
) => {
    if (surah.encrypted && surah.encrypted !== 'unknown') {
        if (!psalm.conversationId) { //this is the second post (first reply) in the conversation
            const oSurah = suwar.find(curSurah => curSurah.pid === payload.to[0].pid)
            // TODO:  this must be changed if the multiperson conversation will be implemented
            // possibly to an array of oSuwar?
            const renga = {
                id: `/${oSurah.pid}/direct/${surah.pid}`,
                firstPid: oSurah.pid,
                secondPid: surah.pid,
                suwar: [oSurah, surah],
                latest: surah.result.timestamp,
                fresh: surah.encrypted === 'their'
            }
            if (!rengashu.find(curRenga => curRenga.id === renga.id)) {
                rengashu.push(renga)
            } // or else?
        } else {
            const renga = rengashu.find(curRenga => curRenga.id === psalm.conversationId)
            if (!renga) {
                //possibly error
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
    rengashu.sort(((a, b) => new Date(b.latest) - new Date(a.latest))) // descending
}

export default addSurahToRenga

