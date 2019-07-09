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

const handleReply = (mantra, resolution, callback) => {
    if (repliesPending.has(mantra.inReplyTo)) {
        const {resolve, reject} = repliesPending.get(mantra.inReplyTo)
        repliesPending.delete(mantra.inReplyTo)
        resolve(resolution) // we can also use sender, etc
    }
}

export {
    waitForReply,
    handleReply
}
