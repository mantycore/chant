import msgpack from 'msgpack-lite'



import toCID from './cid.js'
import crypto from './crypto.js'

import addHandlers from './mantra/'
import { getContent, ping } from './mantra/request/get/'

import broadcast from './mantra/broadcast.js'

import asBuffer, {asBufferPlain} from './psalm/asBuffer.js'

import aggregate from './surah/'

export default state => {
    const {isServerNode, pr} = state
    const peers = new Map()
    const contentStore = state.contentStore || new Map()

    let writeAttachment = () => {}
    if (isServerNode) {
        writeAttachment = state.writeAttachment //TODO: improve
    }

    let stateChangeHandler = () => {} // TODO: replace with messages
    const onStateChange = handler => stateChangeHandler = handler
    // --- THINGS THAT USE GETTERS ---
/**/const getAndStoreContent = async cid => {
/**/    try {
/**/        const attachment = await getContent(cid, peers, pr) // mantra/request
            const storageAttachment = {...attachment, buffer: attachment.buffer} //BSON: buffer(Binary).buffer; msgpack: just buffer
/**/        contentStore.set(cid, {payload: storageAttachment}) //TODO: on server, store only metadata in the contentStore, and load buffer only on request
            /*if (isServerNode) {
                await writeAttachment(storageAttachment)
            }*/
            stateChangeHandler('put attachment', {cid, attachment: {payload: storageAttachment}})
            return {cid, attachment: storageAttachment}
/**/    } catch (e) {
/**/        console.log("Exception durig getting content file #", cid, e)
/**/        throw e
/**/    }
    }
    // TODO: move to a separate module -------------------------------------------------------------
    const poemata = state.poemata || [] //could also contain haikus 
    const suwar = []
    const rengashu = []

    poemata.forEach(poema => aggregate(
        poema,
        suwar, // modified as a result
        contentStore, // modified as a result
        () => stateChangeHandler, // called as a result
        rengashu, // modified as a result
        getAndStoreContent,
        poemata
    ))
    // TODO: move to a separate module -------------------------------------------------------------
    //const generatePId = () => `${pr.id.toString('hex')}:${new Date().toISOString()}`
    //obsolete
    // --- PUTTERS ---
    const putContent = async payload => {
        const cid = await toCID(payload)
        contentStore.set(cid, payload)
        broadcast({type: 'req content put', payload}, false, peers, pr)
        return cid
    }

    const putPostToStore = poema => {
        if (poema.opid === null) {
            delete poema.opid // hacky, improve
        }
/**/    poemata.push(poema)
        const surah = aggregate(
            poema,
            suwar, // modified as a result
            contentStore, // modified as a result
            () => stateChangeHandler, // called as a result
            rengashu, // modified as a result
            getAndStoreContent,
            poemata
        )
        //console.log(poema, surah)
        stateChangeHandler('put post', {poema, surah})
    }

    // --- THINGS THAT USE GETTERS II ---
/**/setInterval(async () => {
/**/    for (const peer of peers.values()) {
/**/        try {
/**/            const payload = {
/**/                type: isServerNode ? 'server' : 'browser',
/**/                persistent: isServerNode //TODO: think about better capabilities format
/**/            }
/**/            await ping(payload, peer.nid, pr) // mantra/request
/**/        } catch (error) {
/**/            peers.delete(peer)
/**/            stateChangeHandler('delete peer', {nid: peer})
/**/        }
/**/    }
/**/}, 10000)

    const storePost = poema => {
/**/    putPostToStore(poema) //TODO: simplify calls and naming scheme

/**/    if (isServerNode) {
/**/        if (poema.attachments) {
/**/            poema.attachments.map(async attachment => {
/**/                if (!contentStore.get(attachment.cid)) {
/**/                    try {
                            await getAndStoreContent(attachment.cid) //stateChangeHandler is fired inside; think if it is good solution
/**/                    } catch(e) {
/**/                        console.log("timeout (10s) on waiting the attachment", attachment)
/**/                    }
/**/                }
/**/            })
/**/        }
/**/    }
/**/}

    Object.assign(state, {
        peers,
        contentStore,
        poemata,
        suwar,
        // messagesProcessed, // mantra/ internal
        rengashu,

        putContent,
        getContent, // mantra/request
        putPost,
        //repliesPending, // mantra/reply internal

        revoke,
        updatePost,

        getAndStoreContent,

        onStateChange,

        Buffer,
        toCID,
        // microjson,
        crypto
    })

    addHandlers({
        pr,
        peers,
        poemata,
        getStateChangeHandler: () => stateChangeHandler,
        storePost,
        contentStore,
        isServerNode
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
