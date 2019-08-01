// @flow
import type { Mantra, MantraWithId } from 'Mantra/.flow/'
import log from 'Common/log.js'
import PROTOCOL_VERSION from 'Common/version.js'

const send = (
    id: any,
    mantra: Mantra | MantraWithId,
    binary: boolean = false,
    pr: any
) => {
    const newMantra = Object.assign({}, mantra)
    let mid: string

    if (typeof mantra.mid === 'string') {
        mid = mantra.mid
    } else {
        mid = new Date().toISOString()
        Object.assign(((newMantra: any): MantraWithId), {mid, version: PROTOCOL_VERSION})
        // I do not want to create a new object, so
        // I need to unsafely cast Mantra to MantraWithId
    }
    if (mantra.type !== 'ping' && mantra.type !== 'pong') {
        //log.info
        console.log("SEND", id.toString('hex', 0, 2), mantra)
    }
    pr.send(id, newMantra, binary)
    return mid
}

export default send
