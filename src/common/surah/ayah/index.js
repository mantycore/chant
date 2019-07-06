import asBuffer from 'Psalm/asBuffer.js'
import verify from './verify.js'
import { inner } from 'Common/createPost.js' // psalm

export { Buffer } from 'buffer'
import bs58 from 'bs58'
import crypto from 'Common/crypto.js'

const ayat = (post, plainPost, directSide, postsAggregated) => {
    let postAggregated

    if (directSide !== 'unknown') {
        const updateProof = plainPost.proofs && plainPost.proofs.find(proof =>
            proof.type === 'put' ||
            proof.type === 'patch' ||
            proof.type === 'delete')
        // there should be no more than one
        if (updateProof) {
            //case 1: post has put/delete proofs, so there must be an original in pa
            postAggregated = postsAggregated.find(pa => pa.pid === updateProof.pid) // TODO: or else
            postAggregated.posts.push(plainPost)
            postAggregated.posts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            //postAggregated.latest = postAggregated.posts[postAggregated.posts.length - 1]

            // curently this is the code for body updating only.
            // it doesn't support attachemnt addition or deletion,
            // and may or may not support other operations.
            // generally, primitive values are updated correctly,
            // but arrays can be put but not patched.
            // TODO: massive rewrite?
            let result = {
                ...inner(postAggregated.origin),
                ...(postAggregated.origin.proofs ? {proofs: [...postAggregated.origin.proofs]} : {}),
                ...(postAggregated.origin.contentMap ? {contentMap: {...postAggregated.origin.contentMap}} : {})
            }

            // leaks 'from' field to other nodes!!!
            if (result.proofs) {
                for (const proof of result.proofs) {
                    Object.assign(proof, {from: postAggregated.pid})
                }
            }

            for (const postVersion of postAggregated.posts) {
                const versionProof = postVersion.proofs && postVersion.proofs.find(curProof => curProof.pid === postAggregated.pid)
                if (versionProof) { //there is no proof only if this is origin
                    if (verify(postVersion, versionProof, postAggregated.origin)) {
                        switch (versionProof.type) {
                            case 'patch':
                                Object.assign(result, inner(postVersion))

                                result.proofs = result.proofs || []
                                for (const p of postVersion.proofs) {
                                    if (!postAggregated.origin.proofs || !postAggregated.origin.proofs.find(pp => pp.pid === p.pid)) {
                                        // todo: decide if it is necessary or safe to push updating proofs
                                        result.proofs.push({...p, from: postVersion.pid})
                                    }
                                }
                                
                                if (result.contentMap || postVersion.contentMap) {
                                    result.contentMap = postVersion.contentMap && Object.keys(postVersion.contentMap).length > 0
                                        ? postVersion.contentMap
                                        : result.contentMap // replaced only if the patch has new content map
                                }
                                Object.keys(result).forEach(key => {
                                    if (result[key] === '$delete') {
                                        delete result[key] // somewhat hacky
                                    }
                                })
                                break
                            case 'put':
                                result = {...inner(postVersion)}
                                result.proofs = postVersion.proofs //are always replaced whole!
                                if (postVersion.contentMap) {
                                    result.contentMap = postVersion.contentMap
                                }
                                break
                            case 'delete':
                                Object.assign(result, {revoked: true})
                        }
                    } else {
                        console.error('Counterfeit proof in the post history', postVersion, versionProof, postAggregated.origin)
                    }
                }
            }
            postAggregated.result = result
        } else {
            //case 2: post has no proofs, so it must be new

            /*console.log("LOAD CHECK")
            console.log(plainPost.directKey)
            console.log(microjson(inner(plainPost)))
            console.log(bs58.encode( Buffer.from(microjson(inner(plainPost))) ))
            console.log(bs58.encode(crypto.direct.signOrigin( Buffer.from(microjson(inner(plainPost))) )))
            console.log(bs58.decode(plainPost.directKey).equals(Buffer.from(crypto.direct.signOrigin( Buffer.from(microjson(inner(plainPost))) ))))
            */

            postAggregated = {
                pid: plainPost.pid,
                posts: [plainPost],
                origin: plainPost,
                //latest: plainPost,
                result: plainPost,
                //TODO: move to a separate file?
                my: bs58.decode(plainPost.directKey).equals(      // Buffer
                    Buffer.from(                             // Buffer
                        crypto.direct.signOrigin(            // Uint8Array
                            asBuffer(plainPost))))                // Buffer
            }
            // leaks 'from' field to other nodes!!!
            if (plainPost.proofs) {
                for (const proof of plainPost.proofs) {
                    Object.assign(proof, {from: postAggregated.pid})
                }
            }
            if (directSide) {
                Object.assign(postAggregated, {to: post.to, encrypted: directSide})
            }
            postsAggregated.push(postAggregated)
        }
    } else {
        const minimalPost = {
            pid: post.pid,
            timestamp: post.timestamp,
            version: post.version
        }
        postAggregated = {
            pid: post.pid,
            posts: [minimalPost],
            origin: minimalPost,
            //latest: minimalPost,
            result: minimalPost,
            my: false,
            to: post.to,
            encrypted: 'unknown'
        }
    }
    postsAggregated.sort(((a, b) => new Date(a.origin.timestamp) - new Date(b.origin.timestamp))) //ascending

    return postAggregated
}

export default ayat
