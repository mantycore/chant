import bs58 from 'bs58'

const selectPath = state => {
    const path = state.maya.path
    let mode = null, sutraPid = null, tag = null, rengaId = null, scrollTrigger = false, valid = true

    if (path[0] === 'directs') {
        mode = 'directs list'
    // --------------------------------------- TODO for v1 v
    } else if (path[1] === '~') {
        mode = 'tilde'
    // --------------------------------------- TODO for v1 ^
    } else if (path[1] && bs58.decode(path[1]).length === 64) {
        sutraPid = path[1]

        const oSurah = state.surah.suwar.find(surah => surah.pid === path[1])
        if (oSurah) {
            if (oSurah.result.tags) {
                tag = oSurah.result.tags[0]
                //TODO: what if there are more than one tag?
            }

            if (path[2] && path[2] === 'direct') {
                if (path[3] && bs58.decode(path[3]).length === 64) {
                    mode = 'direct conversation'
                    rengaId = path.slice(0, 4).join('/')
                    sutraPid = null //??
                    tag = null //??
                    scrollTrigger = true
                } else {
                    mode = 'direct'
                }
            } else {
                mode = 'thread'
                scrollTrigger = true //TODO: scroll to a specific post in thread. #/pid/head ?
            }
        }
    } else if (path[1]) {
        mode = 'tag'
        tag = path[1]
    } else {
        mode = 'tag'
        tag = 'd'
        //TODO: detect invalid path in reducer?
    }

    return {
        mode,
        tag,
        sutraPid,
        rengaId,
        scrollTrigger,
        valid
    }
}

const selectTags = state => Object.entries(state.surah.suwar.reduce((acc, cur) => {
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
    state.surah.suwar
        .filter(surah => surah.result.tags && surah.result.tags.includes(tag))
        .map(surah => [surah, ...selectSuwarBySutraPid(state, surah.pid)])
        //TODO: if not sage
        .sort((suwarA, suwarB) => {
            return suwarB[suwarB.length - 1].origin.timestamp - suwarA[suwarA.length - 1].origin.timestamp
        })

const selectSuwarBySutraPid = (state, pid) => pid && state.surah.suwar.filter(surah => surah.result.opid === pid)

const selectSurahByPid = (state, pid) => pid && state.surah.suwar.find(surah => surah.pid === pid)

const selectRengashu = state => state.surah.rengashu

const selectRenga = (state, rid) => {
    if (!rid) return [null, null];
    const renga = state.surah.rengashu.find(curRenga => curRenga.id === rid)
    if (renga) {
        const [oSurah, ...suwar] = renga.suwar
        return [oSurah, suwar]
    } else {
        return [null, null]
    }
}

export {
    selectPath,
    selectTags,
    selectSutraniByTag,
    selectSuwarBySutraPid,
    selectSurahByPid,
    selectRengashu,
    selectRenga
}
