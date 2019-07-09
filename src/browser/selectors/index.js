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
}, {}))

const selectSutraniByTag = (state, tag) => tag &&
    state.suwar.filter(surah => surah.result.tags && surah.result.tags.includes(tag)) // TODO: sort on the latest comment in the thread = bump (if not sage)

const selectSuwarBySutraPid = (state, pid) => pid && state.suwar.filter(surah => surah.result.opid === pid)

const selectSurahByPid = (state, pid) => pid && state.suwar.find(surah => surah.pid === pid)

export {
    selectTags,
    selectSutraniByTag,
    selectSuwarBySutraPid,
    selectSurahByPid
}
