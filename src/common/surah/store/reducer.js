import produce from 'immer'

export default (state, action) => produce(state, draft => {
    switch (action.type) {
        case 'prakriti surah put': {
            const {suwar, rengashu} = draft.surah

            const surah = suwar.find(curSurah => curSurah.pid === action.surah.pid)
            if (surah) {
                Object.assign(surah, action.surah)
            } else {
                suwar.push(action.surah)
            }
            suwar.sort(((a, b) =>
                new Date(a.origin.timestamp) - new Date(b.origin.timestamp))) //ascending

            if (action.renga) {
                const renga = rengashu.find(curRenga => curRenga.id === action.renga.id)
                if (renga) {
                    Object.assign(renga, action.renga)
                } else {
                    rengashu.push(action.renga)
                }
                rengashu.sort(((a, b) => new Date(b.latest) - new Date(a.latest))) // descending
            }

        }
        break
    }
})
