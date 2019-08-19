// @flow

/*
export type ContentPayload = {|
    cid: string, //cid
    type: string,
    name: string,
    size: number
|}*/

//TODO: fix
export type ContentPayload = {
    cid: string,
    buffer?: Buffer,
    type: string,
    name: string,
    size: number,
    timestamp?: number //not present in "choir, decrypted"!
} | {
    cid: string,
    text: string,
    buffer: Buffer
}

export type InnerPsalm = {
    timestamp: number,
    version: number,

    body?: {
        cid: string, //cid
        text: string
    },
    opid?: string, //bs58
    tags?: string[],
    conversationId?: string, // {bs58}/direct/{bs58}
    attachments?: ContentPayload[]
}

export type Ayah = {
    signature: string, //bs58
    type: string, //enum
    pid: string //bs58
}

export type Psalm = {
    ...InnerPsalm,

    pid: string, //bs58
    proofKey: string, //bs58
    proofSignature: string, //bs58
    directKey: string, //bs58
    proofs?: Ayah[],
    contentMap?: {[string]: string} //cid -> cid
}

export type To = {
    pid: string,
    key: string //base64
}

export type Haiku = {
    ciphertext: string, //base64
    to: To[],
    senderKey: string, //base64

    timestamp: number,
    pid: string,
    version: number 
}

export type Poema = Psalm | Haiku
