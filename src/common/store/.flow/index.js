//@flow
import type { PeerRelayClient, PeerPayload } from 'Mantra/.flow'
import type { Poema, ContentPayload } from 'Psalm/.flow'

//does't check any PeerPayload fields!
export type Peer = {
    nid: Buffer
}

export type Content = {|
    status: {
        replicated: {[string]: boolean},
        persisted: {[string]: boolean},
        isLoading: 'null' | 'loading' | 'loaded' | 'failure',
        source: null | 'choir' | 'terma' | 'maya'
    },
    payload: ?ContentPayload
|}

export type CommonPrakriti = {|
    init: {|
        isServerNode?: boolean,
        initiation?: boolean,
        secretCode?: string,
        prOptions?: {|
            bootstrap: Array<string>,
            port?: number
        |},
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
