import toCID from './cid.js'
import { Buffer } from 'buffer'
import BSON from 'bson'
import thousandFile from './google-10000-english.txt'
import tweetnacl from 'tweetnacl'

const thousand = thousandFile.split('\n')
const pass = () => Array(4).fill(() => Math.floor(Math.random() * 10000)).map(rand => thousand[rand()]).join('-')
const masterPassword = pass()

export default state => {
    const {isServerNode, pr} = state
    const peers = new Set()
    const contentStore = new Map()
    const posts = []
    const messagesProcessed = new Set()

    const generatePId = () => `${pr.id.toString('hex')}:${new Date().toISOString()}`

    const pr_send = (id, message, binary = false) => {
        const newMessage = Object.assign({}, message)
        let mid
        if (message.mid) {
            mid = message.mid
        } else {
            mid = new Date().toISOString()
            Object.assign(newMessage, {mid})
        }
        if (message.type !== 'ping' && message.type !== 'pong') {
            const {payload1: omit, ...messageSansPayload} = newMessage
            console.log("SEND", id.toString('hex', 0, 2), messageSansPayload) // JSON.stringify()
        }
        pr.send(id, newMessage, binary)
        return mid
    }

    const broadcast = message => { // closed on peers and pr
        const newMessage = Object.assign({}, message)
        let mid // TODO: think about better solution
        for (const peer of peers.values()) {
            // TODO: add already processed nodes
            if (!message.origin || !(peer.equals(message.origin))) {
                mid = pr_send(peer, newMessage)
                Object.assign(newMessage, {mid})
            }
        }
        return mid
    }

    let stateChangeHandler = () => {}
    const onStateChange = handler => stateChangeHandler = handler

    // --- REPLIES ---
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

    // --- PUTTERS ---

    const putContent = async payload => {
        const cid = await toCID(payload)
        contentStore.set(cid, payload)
        broadcast({type: 'put content', payload})
        return cid
    }

    const putPost = async ({body, filesToLoad}) => {
        
        if (!filesToLoad && body === '') {
            return
        }

        const pFileReader = method => file => new Promise((resolve, reject) => {
            const fileReader = new FileReader()
            fileReader.onload = resolve
            fileReader[method](file)
        })

        let files = []
        let filesFull = []
        if (filesToLoad) {
            const arrayBufferReaders = await Promise.all(Array.from(filesToLoad).map(pFileReader('readAsArrayBuffer')))
            const arrayBuffers = arrayBufferReaders.map(event => event.target.result)  // change to Buffers, check if the result is the same
            const cids = await Promise.all(arrayBuffers.map(toCID))

            const buffers = arrayBuffers.map(arrayBuffer => Buffer.from(arrayBuffer))

            //const dataURLReaders = await Promise.all(Array.from(filesToLoad).map(pFileReader('readAsDataURL')))
            //const dataURLs = dataURLReaders.map(event => event.target.result)

            //filesFull = Array.from(filesToLoad).map((file, i) => ({dataURL: dataURLs[i], cid: cids[i], type: file.type, name: file.name, size: file.size})) // size, lastModified
            filesFull = Array.from(filesToLoad).map((file, i) => ({buffer: buffers[i], cid: cids[i], type: file.type, name: file.name, size: file.size})) // size, lastModified
            files = Array.from(filesToLoad).map((file, i) => ({cid: cids[i], type: file.type, name: file.name, size: file.size})) // size, lastModified
            filesFull.forEach(file => {
                contentStore.set(file.cid, file)
            })
        }

        const cid = await toCID(body)
        contentStore.set(cid, {type: 'text/plain', body, cid}) // todo: regularize with files?

        let post = {pid: generatePId(), bodyCid: cid, body, timestamp: new Date().toUTCString()}
        if (files.length > 0) {
            post = Object.assign(post, {files})
        }
        posts.push(Object.assign({}, post, {body}))
        posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        stateChangeHandler()

        broadcast({type: 'put post', post})
    }

    // --- GETTERS ---

    const getContent = async cid => new Promise((resolve, reject) => {
        const mid = pr_send(Array.from(peers)[0], {type: 'get content', cid}) //NB! only one reply is handled. Needs fixing
        waitForReply(mid, resolve, reject, 10000)
    })
    
    const ping = async peer => new Promise((resolve, reject) => {
        const mid = pr_send(peer, {type: 'ping'})
        waitForReply(mid, resolve, reject)
    })
    
    const getPosts = async peer => new Promise((resolve, reject) => {
        const mid = pr_send(peer, {type: 'get posts'})
        waitForReply(mid, resolve, reject)
    })

    // --- THINGS THAT USE GETTERS ---

    const getAndStoreContent = async cid => {
        try {
            const file = await getContent(cid)
            const storageFile = {...file, buffer: file.buffer.buffer}
            contentStore.set(cid, storageFile)
            stateChangeHandler()
        } catch (e) {
            console.log(e)
        }
    }

    /*setInterval(async () => {
        for (const peer of peers.values()) {
            try {
                await ping(peer)
            } catch (error) {
                peers.delete(peer)    
            }
        }
    }, 10000)*/

    let postInitialized = false
    pr.on('peer', async id => {
        console.log('PEER', id.toString('hex', 0, 2))
        peers.add(id)
        if (!postInitialized) {
            try {
                const newPosts = await getPosts(id)
                for (const post of newPosts) {
                    if (!posts.find(localPost => localPost.pid == post.pid)) {
                        storePost(post)
                    }
                    //posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    //stateChangeHandler()
                }
                postInitialized = true
            } catch (error) {
                // do nothing
            }
        }
    })

    const storePost = post => {
        posts.push(post)
        posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        stateChangeHandler() //todo: optimize
        if (isServerNode) {
            if (post.files) {
                post.files.map(async file => {
                    if (!contentStore.get(file.cid)) {
                        try {
                            await getAndStoreContent(file.cid) //stateChangeHandler is fired inside; think if it is good solution
                        } catch(e) {
                            console.log("timeout (10s) on waiting the file", file)
                        }
                    }
                })
            }
        }
    }

    Object.assign(state, {
        peers,
        contentStore,
        posts,
        messagesProcessed,

        putContent,
        getContent,
        putPost,
        repliesPending,

        getAndStoreContent,

        onStateChange,

        Buffer,
        toCID,
        BSON
    })

    /*
    messages scheme:
    'ping' -> 'pong'
    'get posts' -> 'put posts'
    'get content' -> 'content found'

    'put post' (=> 'get content')
    'put content'

    TODO: regularize the scheme
    */

    pr.on('message', async (message, from) => {
        if (message.type !== 'ping' && message.type !== 'pong') {
            const {payload1: omit, ...messageSansPayload} = message
            console.log('RECV', from.toString('hex', 0, 2), messageSansPayload) //JSON.stringify(messageSansPayload)
        }
        const forwardedMessage = Object.assign({}, message, {origin: message.origin ? Buffer.from(message.origin.data) : from})
        {
            const umid = `${forwardedMessage.origin.toString('hex')}:${message.mid}`
            if (messagesProcessed.has(umid)) {
                return
            } else {
                messagesProcessed.add(umid)
            }
        }
        switch (message.type) {
            case 'put post': {
                if (!posts.find(post => post.pid === message.post.pid)) {
                    broadcast(forwardedMessage)
                    // TODO: optimize: do not sent the post to nodes we know already have it
                    storePost(message.post)
                }
                //message.post.body = await getContent(message.post.bodyCid)
                break
            }

            case 'put content': { //not used for now
                const cid = await toCID(message.payload);
                if (!contentStore.get(cid)) {
                    contentStore.set(cid, message.payload)
                    broadcast(forwardedMessage) 
                     // TODO: optimize: do not sent the post to nodes we know already have it
                     // TODO: optimize: send only to server nodes? or, better, send to all nodes, but only server nodes should store it.
                }
                break
            }

            case 'get content': { // todo: split to query (~= head) and get
                const payload = contentStore.get(message.cid)
                if (payload) {
                    pr_send(forwardedMessage.origin, {type: 'content found', payload, inReplyTo: message.mid}, /*binary*/ true)
                } else {
                    broadcast(forwardedMessage)
                }
                break
            }
            case 'content found': {
                handleReply(message, message.payload)
                break
            }

            case 'ping': {
                pr_send(from, {type: 'pong', inReplyTo: message.mid})
                break
            }
            case 'pong': 
                handleReply(message)
                break

            case 'get posts': {
                pr_send(forwardedMessage.origin, {type: 'put posts', posts, inReplyTo: message.mid})
                broadcast(forwardedMessage)
                break
            }
            case 'put posts': {
                handleReply(message, message.posts)
                break
            }
        }
    })
}

/*

post structure:
id (id)
thread (id) // original post 
- or -
tags (array of strings/tagids)
text (cid) // body
attachments (array of cids)

*/
