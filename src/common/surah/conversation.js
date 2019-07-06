const addPostToConversation = (
    post,
    plainPost,
    postAggregated,
    postsAggregated,
    conversations
) => {
    if (postAggregated.encrypted && postAggregated.encrypted !== 'unknown') {
        if (!plainPost.conversationId) { //this is the second post (first reply) in the conversation
            const oPost = postsAggregated.find(pa => pa.pid === post.to[0].pid)
            // TODO:  this must be changed if the multiperson conversation will be implemented
            // possibly to an array of oPosts?
            const conversation = {
                id: `/${oPost.pid}/direct/${post.pid}`,
                firstPid: oPost.pid,
                secondPid: postAggregated.pid,
                posts: [oPost, postAggregated],
                latest: postAggregated.result.timestamp,
                fresh: postAggregated.encrypted === 'their'
            }
            if (!conversations.find(c => c.id === conversation.id)) {
                conversations.push(conversation)
            }
        } else {
            const conversation = conversations.find(c => c.id === plainPost.conversationId)
            if (!conversation) {
                //possibly error
                const [_, first, __, second] = plainPost.conversationId.split('/')
                conversation = {id: plainPost.conversationId, posts: [], latest: 0, fresh: true, firstPid, secondPid, headless: true}
                console.log('Headless conversation', conversation)
                conversations.push(conversation)
            }
            if (!conversation.posts.includes(postAggregated)) {
                conversation.posts.push(postAggregated)
                conversation.posts.sort(((a, b) => new Date(a.origin.timestamp) - new Date(b.origin.timestamp)))
                conversation.latest = conversation.posts[conversation.posts.length - 1].result.timestamp // NB
                conversation.fresh = postAggregated.encrypted === 'their'
            }
        }
    }
    conversations.sort(((a, b) => new Date(b.latest) - new Date(a.latest))) // descending
}

export default addPostToConversation
