const initialState = {
    peers: new Set(),
    poemata: [],
    suwar: [],
    contentStore: new Map(),
    rengashu: [],
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

    newState: {
        maya: {
            mode: 'tag', //not yet used
            tag: 'd',
            sutraPid: null
        },
        suwarList: {
            scrollTrigger: 0
        },
        postForm: {
            //move from postBeingEdited
            filesToLoad: []
        }
    }
}

export default initialState
