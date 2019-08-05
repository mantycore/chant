const initialState = {
    //peers: new Set(),
    //poemata: [],
    //suwar: [],
    //contentStore: new Map(),
    //rengashu: [],
    getAndStoreContent: () => {},
    putPost: () => {},
    revoke: () => {},
    attachmentIsLoading: {},

    //postsMode: 'tag',
    //opost: null,
    //tag: 'd',

    postBeingEdited: {
        body: '',
        mode: 'put',
        post: null
    },

    displaySplash: true,

    maya: {
        theme: 'light',
        path: '/d/',

        mode: 'tag',
        tag: 'd',
        sutraPid: null,
        rengaId: null,

        scrollTrigger: false // todo: move?
    },

    newState: { //move to maya
        suwarList: {
            scrollTrigger: 0,
            autoScrollAllowed: true
        },
        postForm: {
            //move from postBeingEdited
            filesToLoad: []
        }
    }
}

export default initialState
