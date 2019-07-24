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

const handleReply = (mantra, resolution, callback) => {
    if (repliesPending.has(mantra.re)) {
        const {resolve, reject} = repliesPending.get(mantra.re)
        repliesPending.delete(mantra.re)
        resolve(resolution) // we can also use sender, etc
    }
}

export {
    waitForReply,
    handleReply
}
