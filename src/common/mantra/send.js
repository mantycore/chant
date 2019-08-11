// @flow
import type { Mantra, MantraWithId, PeerRelayClient } from 'Mantra/.flow/'
import log from 'Common/log.js'
import PROTOCOL_VERSION from 'Common/version.js'

const send = (
    id: any,
    mantra: Mantra | MantraWithId,
    binary: boolean = false,
    pr: PeerRelayClient
): string => {
    let mid: string
    let mantraWithId: MantraWithId

    if (mantra.mid && typeof mantra.mid === 'string') {
        mid = mantra.mid
        mantraWithId = mantra
    } else {
        mid = new Date().toISOString()
        mantraWithId = {...mantra, mid, version: PROTOCOL_VERSION}
        // I did not want to create a new object, but
        // flow forced me to :0
    }
    if (mantra.type !== 'ping' && mantra.type !== 'pong') {
        //log.info
        console.log("SEND", id.toString('hex', 0, 2), mantra)
    }
    pr.send(id, mantraWithId, binary)
    return mid
}

export default send
