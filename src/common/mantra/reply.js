const repliesPending = new Map()

const waitForReply = (mid, resolve, reject, timeout = 1000) => {
    repliesPending.set(mid, {resolve, reject, timestamp: new Date()})

    if (timeout) {
        setTimeout(() => {
          if (repliesPending.has(mid)) {
            reject()
            repliesPending.delete(mid)
          }
        }, timeout)
    }
}

const handleReply = (message, resolution, callback) => {
    if (repliesPending.has(message.inReplyTo)) {
        const {resolve, reject} = repliesPending.get(message.inReplyTo)
        repliesPending.delete(message.inReplyTo)
        resolve(resolution) // we can also use sender, etc
    }
}

export {
    waitForReply,
    handleReply
}
