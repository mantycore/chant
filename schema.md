# Post object type/schema/format (codename Psalm)

Inner post:

    {
        body: {
            cid: string:cid
            text: string
        }
        attachments: [{
            cid: string:cid
            type: string:mime
            name: string
            size: number 
        }]
        tags: [string] // ADD
        opid: string:bs58:pid // ADD

        links: [string:bs58:pid] // possibly ADD

        timestamp: number:epoch
        version: number
    }
    
Outer post:    

    {
        #include innerPost
        
        // it is not very necessary to use bs58 encoding for the signatures, as they are not used
        // as names and generally are not displayed much. Maybe it is better to use standard
        // base64 encoding; or to switch to binary format?
        proofKey: string:bs58:32 // public key for verifying signatures on this post and on follow-ups
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

I guess _both_ plaintext post and encrypted post must have timestamp and version fields.

Ciphertext in current version is based on the outer post, so all other signatures are inside the secretbox.
