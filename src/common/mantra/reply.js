const repliesPending = new Map()

const waitForReply = (mid, resolve, reject, timeout = 1000) => {
    repliesPending.set(mid, {resolve, reject, timestamp: new Date()})

    if (timeout) {
        setTimeout(() => {
          if (repliesPending.has(mid)) {
            reject(new Error("timeout waiting for res mantra", mid))
            repliesPending.delete(mid)
          }
        }, timeout)
    }
}

const waitForReplies = (mid, observer, timeout = 1000) => {
    waitForReply(mid, observer.next.bind(observer), observer.complete.bind(observer), timeout) //TODO: mechanism to call observer.error
}

const handleReply = (mantra, resolution) => {
    if (repliesPending.has(mantra.re)) {
        const {resolve} = repliesPending.get(mantra.re)
        repliesPending.delete(mantra.re)
        resolve(resolution) // we can also use sender, etc
    }
}

const handleReplies = (mantra, resolution) => {
    if (repliesPending.has(mantra.re)) {
        const {resolve} = repliesPending.get(mantra.re)
        resolve(resolution) // we can also use sender, etc
    }
}

export {
    waitForReply,
    waitForReplies,
    handleReply,
    handleReplies
}
