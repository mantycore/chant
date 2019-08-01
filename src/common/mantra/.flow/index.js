// @flow
export type MantraWithId = {
    mid: string,
    version: number,
    type: string,
    payload: ?MicroJSON,
    status: ?MicroJSON,
    re: ?string
}

export type Mantra = {
    type: string,
    payload: ?MicroJSON,
    re: ?string
}

export type MicroJSON = (string | number | Array<MicroJSON> | {[string]: MicroJSON})

export type PeerRelayClient = {
    send(Buffer, MicroJSON, boolean): void
}
