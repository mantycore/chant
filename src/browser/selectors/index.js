const selectTags = state => Object.entries(state.suwar.reduce((acc, cur) => {
    if ('tags' in cur.result) {
        cur.result.tags.forEach(tag => {
            if (tag in acc) {
                acc[tag] += 1
            } else {
                acc[tag] = 1
            }
        })
    }
    return acc
}, {})).sort((a, b) => b[1] - a[1])

const selectSutraniByTag = (state, tag) => tag &&
    state.suwar
        .filter(surah => surah.result.tags && surah.result.tags.includes(tag))
        .map(surah => [surah, ...selectSuwarBySutraPid(state, surah.pid)])
        //TODO: if not sage
        .sort((suwarA, suwarB) => {
            return suwarB[suwarB.length - 1].origin.timestamp - suwarA[suwarA.length - 1].origin.timestamp
        })

const selectSuwarBySutraPid = (state, pid) => pid && state.suwar.filter(surah => surah.result.opid === pid)

const selectSurahByPid = (state, pid) => pid && state.suwar.find(surah => surah.pid === pid)

const selectRengashu = state => state.rengashu

const selectRenga = (state, rid) => {
    if (!rid) return null;
    const renga = state.rengashu.find(curRenga => curRenga.id === rid)
    const [oSurah, ...suwar] = renga.suwar
    return [oSurah, suwar]
}

export {
    selectTags,
    selectSutraniByTag,
    selectSuwarBySutraPid,
    selectSurahByPid,
    selectRengashu,
    selectRenga
}
