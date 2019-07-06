import decrypt from './decrypt.js'
import ayat from './ayah/'
import addPostToConversation from './conversation.js'

const aggregate = (
    post,
    postsAggregated,
    contentStore,
    getStateChangeHandler,
    conversations,
    getAndStoreContent
) => {
    let {plainPost, directSide} = decrypt(
        post,
        postsAggregated,
        contentStore, // modified as a effect
        getStateChangeHandler, // called as a effect
        getAndStoreContent
    )

    const postAggregated = ayat(
        post, // TODO: not needed, remove?
        plainPost,
        directSide,
        postsAggregated // modified as a effect
    )

    addPostToConversation(
        post,
        plainPost,
        postAggregated,
        postsAggregated,
        conversations // modifies as a effect
    )

    return postAggregated
}

export default aggregate

