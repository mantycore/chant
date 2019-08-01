import produce from 'immer'

export default (state, action) => produce(state, draft => {
    switch (action.type) {
        case 'terma init complete':
            draft.terma.postgres = action.postgres
        break
    }
})
