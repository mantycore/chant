// @flow
import type { PeerRelayClient, PeerPayload } from 'Mantra/.flow/'
import type { Poema, ContentPayload } from 'Psalm/.flow/'

//does't check any PeerPayload fields!
//TODO: fix
export type Peer = ({} | PeerPayload) & { //|
    nid: Buffer
}

//TODO: fix
export type Content = {|
    //payload: ?ContentPayload
    payload: ?({
        cid: string,
        buffer: Buffer,
        type: string,
        name: string,
        size: number,
        timestamp?: number //not present in "choir, decrypted"!
    } | {
        cid: string,
        text: string,
        buffer: Buffer
    }),
    status: {|
        replicated: {[string]: boolean},
        persisted: {[string]: boolean},
        isLoading: 'null' | 'loading' | 'loaded' | 'failure',
        // flow forbid reassignment from null to string
        source: null | 'choir' | 'choir, decrypted' | 'terma' | 'maya'
    |}
|}

export type CommonPrakriti = {|
    init: {|
        prOptions?: {|
            bootstrap: Array<string>,
            port?: number
        |},
        isServerNode?: boolean,
        secretCode?: string,
        initiation?: boolean,
        pr?: PeerRelayClient
    |},
    mantra: {|
        peers: {[string]: Peer},
        mantrasaProcessed: {[string]: boolean}
    |},
    poema: {|
        poemata: Array<Poema>,
        contents: {[string]: Content}
    |}
|}

export type Prakriti = {...CommonPrakriti}
