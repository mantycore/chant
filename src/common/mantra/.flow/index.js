// @flow
import type { Poema, ContentPayload } from 'Psalm/.flow/'

// for tcomb recursion support:
// recursive
export type MicroJSON = string | number | boolean |
    Array<string> | Array<number> | Array<boolean> |
    Array<{+[any]: MicroJSON}> | {+[any]: MicroJSON}
//solved per https://stackoverflow.com/questions/45992316/recursive-type-definition-in-flow

export type PeerPayload = {|
    type: string,
    persistent: boolean,
    name: string
|}

export type Mantra = {|
    type: 'req poema put',
    payload: Poema
|} | {|
    type: 'res poema put',
    re: any
|} | {|
    type: 'req content put',
    payload: ContentPayload
|} | {|
    type: 'res content put',
    status: {|
        persistent: boolean
    |},
    re: any
|} | {|
    type: 'req content get',
    params: {|
        cid: string
    |}
|} | {|
    type: 'res content get',
    payload: ContentPayload,
    re: any
|} | {|
    type: 'ping',
    payload: PeerPayload
|} | {|
    type: 'pong',
    payload: PeerPayload,
    re: any
|} | {|
    type: 'req poemata get',
    params?: {|
        pid?: string,
        opid?: string,
        tag?: string,
        rid?: string
    |}
|} | {|
    type: 'res poemata get',
    payload: Array<Poema>,
    re: any
|}

export type MantraWithId = {|
    ...Mantra,

    type: any, //TODO: flow fix
    payload: any, //TODO: flow fix
    
    mid: string,
    version: number
|}


export type PeerRelayClient = {
    send(Buffer, MantraWithId, boolean): void,
    on(string, any): void //TODO: flow fix
}
