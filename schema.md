# Post type
Current:

    {
        body: string
        bodyCid: string:cid
        files: [{
            cid: string:cid
            type: string:mime
            name: string
            size: number
        }]
        pid: string:hex,isodate
        timestamp: string:date
    }

Project:

    {
        body: {
            cid: string:cid
            text: string
        }
        files: [{
            cid: string:cid
            type: string:mime
            name: string
            size: number 
        }]
        pid: string:bs58:pid(hash(peerId, timestamp, self hash, random?))
        timestamp: number:epoch
        // ... ... absent so far ... ...
        tags: [string]
        opid\*: string:bs58:pid
        proofs: [{
            pid: string:bs58:pid
            signature: string:bs58:64
        }]
        links: [string:bs58:pid] //??? maybe also external links?
        version: number //?
        // ... ... crypto ... ...
        proofKey: string:bs58:32 // public key for verifying signatures on this post and on followups
        proofSignature: string:bs58:64 // signature to avoid the proofKey being used on another post
        directKey: string:bs58:32 // public key for encrypting directs
    }
    
Direct (asymmetrically encrypted)

    {
        ciphertext: string:bs58 //?
        // 
        to: string:bs58:pid
        pid: string:bs58:pid
        timestamp: number:epoch
        version: number // ??
    }

Symmetrically encrypted

    {
        ciphertext: string:bs58 //?
        publicKey: string:bs58:32
        
        subchant: string:bs58:hash //?
        pid: string:bs58:pid
        timestamp: number:epoch
        version: number // ??
    }
