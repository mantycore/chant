import bs58 from 'bs58'

function copy(draft, action) {
    draft.poemata = [...action.state.poemata]
    draft.suwar = [...action.state.suwar]
    draft.rengashu = [...action.state.rengashu]
    draft.contentStore = new Map(action.state.contentStore)
    draft.peers = new Set(action.state.peers)
}

function handleUrl(draft) {
    draft.opost = null
    draft.tag = null
    const matchData = window.location.hash.match('#(.*)')
    if (!matchData) {
        //window.location.hash = "#/4ZtbyWyXQvtypNdUaGCUqpYKB3VjjC291QA8RGxLzEqhL1qyozfiQvbgkhRxLhMMcweqQSzdapcYfRZuXsYHMiDQ"
        window.location.hash = "#/d/"
        return
    }
    const path = matchData[1].split('/')
    // --------------------------------------- TODO for v1 v
    if (path[0] === 'directs') {
        draft.newState.maya.mode = 'directs list'
    } else if (path[1] === '~') {
        draft.newState.maya.mode = 'tilde'
    // --------------------------------------- TODO for v1 ^

    } else if (path[1] && bs58.decode(path[1]).length === 64) {
        draft.newState.maya.sutraPid = path[1] 

        const oSurah = draft.suwar.find(surah => surah.pid === path[1]) //TODO: or else!
        draft.newState.maya.tag = oSurah.result.tags[0] //TODO: what if there are more than one tag?

        // --------------------------------------- TODO for v1 v
        if (path[2] && path[2] === 'direct') {
            if (path[3] && bs58.decode(path[3]).length === 64) {
                draft.newState.maya.mode = 'direct conversation'
                draft.conversationId = path.slice(0, 4).join('/')
            } else {
                draft.newState.maya.mode = 'direct'
            }
        // --------------------------------------- TODO for v1 ^
        } else {
            draft.newState.maya.mode = 'thread'
        }
    } else if (path[1]) {
        draft.newState.maya.mode = 'tag'
        draft.newState.maya.tag = path[1]
        draft.newState.maya.sutraPid = null
    } else {
        //window.location.hash = "#/4ZtbyWyXQvtypNdUaGCUqpYKB3VjjC291QA8RGxLzEqhL1qyozfiQvbgkhRxLhMMcweqQSzdapcYfRZuXsYHMiDQ"
        window.location.hash = "#/d/"
    }
}

export {
    copy,
    handleUrl
}
