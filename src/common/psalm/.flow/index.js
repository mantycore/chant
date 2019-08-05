// @flow
export type Attachment = { //ContentPayload?
    cid: string, //cid
    type: string,
    name: string,
    size: number
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
    attachments?: Attachment[]
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

type To = {
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
