import produce from 'immer'

const setReplicated = (state, content, hexNid) => {
    content.status.replicated[hexNid] = true
    if (state.mantra.peers[hexNid] && state.mantra.peers[hexNid].persistent) {
        content.status.persisted[hexNid] = true
        // the resource in fact might be not (yet) persisted;
        // maybe a separate follow-up mantra must be sent when
        // the resource is successfully persisted?
    }
}

export default (state, action) => {
    //console.log("RDCR Common", action)
    return produce(state, draft => {
        switch (action.type) {
            case 'init': {
                //draft.init.pr = action.state.pr
                draft.init.prOptions = action.state.prOptions
                draft.init.isServerNode = action.state.isServerNode
                draft.init.secretCode = action.state.secretCode
                draft.init.initiation = action.state.initiation
            }
            break

            case 'mantra init complete': {
                draft.init.pr = action.pr
            }
            break

            /* NB: split handler should the need for different logic arise */
            /* also consider naming it 'prakriti peer create' or something */
            case 'mantra pr peer':
            case 'mantra pr message': {
                // was in Mantra/ (on peer, on message)
                const hexNid = action.nid.toString('hex')
                const peers = draft.mantra.peers
                if (!(hexNid in peers)) {
                    peers[hexNid] = {nid: action.nid}
                }
            }
            break

            /* prakriti mantra put? */
            case 'mantra pr message success': {
                // was in Mantra/ (on message)
                draft.mantra.mantrasaProcessed[action.umid] = true
            }
            break

            case 'prakriti poema put': {
                // was in storePost => putPostToStore
                // delete poema.opid if it is null?
                /*if (action.source === 'choir') {
                    hexNid = action.nid.toString('hex')
                } else {
                    hexNid = 'local'
                }*/
                draft.poema.poemata.push(action.poema)
            }
            break

            /* :::: */

            case 'mantra req content get': {
                let content = draft.poema.contents[action.cid]
                if (!content) {
                    content = draft.poema.contents[action.cid] = {payload: null, status: {replicated: {}, persisted: {}, isLoading: null}}
                }
                content.status.isLoading = 'loading'
            }
            break

            case 'mantra err content get': {
                let content = draft.poema.contents[action.cid]
                if (!content) {
                    content = draft.poema.contents[action.cid] = {payload: null, status: {replicated: {}, persisted: {}, isLoading: null}}
                }
                content.status.isLoading = 'failure'
            }
            break

            /* matra res content get */
            case 'prakriti content put': {
                // was in getAndStoreContent
                let hexNid
                if (action.source === 'choir') {
                    hexNid = action.nid.toString('hex')
                } else {
                    hexNid = 'local'
                }
                let content = draft.poema.contents[action.cid]
                if (!content) {
                    content = draft.poema.contents[action.cid] = {payload: null, status: {replicated: {}, persisted: {}, isLoading: null}}
                }
                content.payload = action.payload
                content.status.isLoading = 'loaded'
                if (!content.status.source) {
                    content.status.source = action.source
                }
                setReplicated(draft, content, hexNid)
            }
            break

            /* TODO: think about it */
            case 'prakriti content status replicated': {
                const hexNid = action.nid.toString('hex')
                const content = draft.poema.contents[action.cid]
                if (content && content.status && content.status.replicated) {
                    setReplicated(draft, content, hexNid)
                }
            }
            break
            /* :::: */

            case 'prakriti peer put': {
                // was in Mantra/ (on message switch)
                const hexNid = action.nid.toString('hex')
                const peers = draft.mantra.peers
                peers[hexNid] = {nid: action.nid, ...(action.payload)}
            }
            break

            case 'prakriti peer delete': {
                // was in root setInterval
                delete draft.mantra.peers[action.hexNid]
            }
            break
        }
    })
}
