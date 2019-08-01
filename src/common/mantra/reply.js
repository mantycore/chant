const repliesPending = new Map()

const waitForReply = (mid, mantra, resolve, reject, timeout = 1000) => {
    repliesPending.set(mid, {mantra, resolve, reject, timestamp: new Date()})

    if (timeout) {
        setTimeout(() => {
          if (repliesPending.has(mid)) {
            reject(new Error(`timeout waiting for res mantra ${mid} ${JSON.stringify(repliesPending.get(mid).mantra)}`))
            repliesPending.delete(mid)
          }
        }, timeout)
    }
}

const waitForReplies = (mid, mantra, peers, observer, timeout = 1000) => {
    const peersMap = peers.reduce((acc, cur) => {acc[cur] = false; return acc;}, {})
    repliesPending.set(mid, {mantra, observer, peers: peersMap, timestamp: new Date()})

    if (timeout) {
        setTimeout(() => {
          if (repliesPending.has(mid)) {
            observer.error(new Error(`timeout waiting for res mantra ${mid} ${JSON.stringify(repliesPending.get(mid).mantra)}`))
            repliesPending.delete(mid)
          }
        }, timeout)
    }
}

const handleReply = (mantra, resolution) => {
    if (repliesPending.has(mantra.re)) {
        const {resolve} = repliesPending.get(mantra.re)
        repliesPending.delete(mantra.re)
        resolve(resolution) // we can also use sender, etc
    }
}

const handleReplies = (from, mantra, resolution) => {
    if (repliesPending.has(mantra.re)) {
        const {observer, peers} = repliesPending.get(mantra.re)
        observer.next(resolution) // we can also use sender, etc
        peers[from] = true
        if (Object.values(peers).reduce((acc, cur) => acc && cur, true)) {
            observer.complete()
            repliesPending.delete(mantra.re)
        }
    }
}

export {
    waitForReply,
    waitForReplies,
    handleReply,
    handleReplies
}
