import produce from 'immer'

export default (state, action) => {
    //console.log("RDCR Common", action)
    return produce(state, draft => {
        switch (action.type) {
            case 'init': {
                draft.init.pr = action.state.pr
                draft.init.isServerNode = action.state.isServerNode
                draft.init.secretCode = action.state.secretCode
                draft.init.initiation = action.state.initiation
            }
            break

            case 'pr peer': /* NB: split handler should the need for different logic arise */
            case 'pr mantra': {
                // was in Mantra/ (on peer, on message)
                const hexNid = action.nid.toString('hex')
                const peers = draft.mantra.peers
                if (!(hexNid in peers)) {
                    peers[hexNid] = {nid: action.nid}
                }
            }
            break

            case 'pr mantra success': {
                // was in Mantra/ (on message)
                draft.mantra.mantrasaProcessed[action.umid] = true
            }
            break

            case 'poema store from remote': {
                // was in storePost => putPostToStore
                // delete poema.opid if it is null?
                draft.poema.poemata.push(action.poema)
            }
            break

            case 'mantra res content get': {
                // was in getAndStoreContent
                draft.poema.contents[action.cid] = {payload: action.content}
            }
            break

            case 'mantra ping':
            case 'mantra pong': {
                // was in Mantra/ (on message switch)
                const hexNid = action.nid.toString('hex')
                const peers = draft.mantra.peers
                peers[hexNid] = {nid: action.nid, ...(action.payload)}
            }
            break

            case 'ping timeout': {
                // was in root setInterval
                delete draft.mantra.peers[action.hexNid]
            }
            break
        }
    })
}
