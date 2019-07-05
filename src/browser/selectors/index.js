const selectTags = state => Object.entries(state.postsAggregated.reduce((acc, cur) => {
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
}, {}))

const selectThreadsByTag = (state, tag) => tag &&
    state.postsAggregated.filter(post => post.result.tags && post.result.tags.includes(tag)) // TODO: sort on the latest comment in the thread = bump (if not sage)

const selectPostsByThreadPid = (state, pid) => thread &&
    state.postsAggregated.filter(post => post.result.opid === pid)

export {
    selectTags,
    selectThreadsByTag,
    selectPostsByThreadPid
}
