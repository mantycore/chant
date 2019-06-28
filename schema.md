# Post object type/schema/format (codename Psalm)

## Current:

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

## Project:
Inner post:

    {
        body: { // MODIFY
            cid: string:cid
            text: string
        }
        attachments: [{ // possibly MODIFY name
            cid: string:cid
            type: string:mime
            name: string
            size: number 
        }]
        tags: [string] // ADD
        opid: string:bs58:pid // ADD

        links: [string:bs58:pid] // possibly ADD

        timestamp: number:epoch // MODIFY
        version: number // ADD, decide on the format
    }
    
Outer post:    

    {
        inner: json:innerPost
 
        proofKey: string:bs58:32 // public key for verifying signatures on this post and on followups
        proofSignature: string:bs58:64 // signature to avoid the proofKey being used on another post
        directKey: string:bs58:32 // public key for encrypting directs
        proofs: [{
            pid: string:bs58:pid
            signature: string:bs58:64
        }]

        pid: string:bs58:pid(hash(peerId, timestamp, self hash, random?))
        timestamp: number:epoch
        version: number
    }
    
Direct (asymmetrically encrypted)

    {
        ciphertext: string:bs58(?):box(outerPost)
        publicKey: string:bs58:32
        to: string:bs58:pid
        
        pid: string:bs58:pid(hash(peerId, timestamp, self hash, random?))
        timestamp: number:epoch
        version: number
    }

Symmetrically encrypted

    {
        ciphertext: string:bs58(?):secretbox(outerPost)
        subchant: string:bs58:hash //?
        
        pid: string:bs58:pid(hash(peerId, timestamp, self hash, random?))
        timestamp: number:epoch
        version: number
    }

Derivative fields:

- pid (_f_ of the plaintext hash and maybe on peer-realy node id. NOT cid, because even identical posts by different peers must have different pids)
- proofKey (_f_ of the plaintext hash and private key + salt)
- proofSingature (_f_ of the plaintext hash and private key + salt)
- directKey (_f_ of the plaintext hash and private key + salt)
- proofs (_f_ of the plaintext hashes of both messages and private key + salt, also pid of the original message)
- ciphertext (_f_ of the plaintext, plus see below)

I guess _both_ inner post and outer post (and also encrypted post) must have timestamp and version fields.

Ciphertext in current version is based on the outer post, so all other signatures are inside the secretbox.
