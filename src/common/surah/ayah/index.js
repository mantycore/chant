import asBuffer from 'Psalm/asBuffer.js'
import verify from './verify.js'
import inner from 'Psalm/inner.js'

export { Buffer } from 'buffer'
import bs58 from 'bs58'
import crypto from 'Common/crypto.js'

const ayat = (payload, psalm, directSide, suwar) => {
    let surah

    if (directSide !== 'unknown') {
        const updateAyah = psalm.proofs && psalm.proofs.find(ayah =>
            ayah.type === 'put' ||
            ayah.type === 'patch' ||
            ayah.type === 'delete')
        // there should be no more than one
        if (updateAyah) {
            //case 1: post has put/delete proofs, so there must be an original in pa
            surah = suwar.find(curSurah => curSurah.pid === updateAyah.pid) // TODO: or else
            surah.psalms.push(psalm)
            surah.psalms.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            //surah.latest = surah.psalms[surah.psalms.length - 1]

            // curently this is the code for body updating only.
            // it doesn't support attachemnt addition or deletion,
            // and may or may not support other operations.
            // generally, primitive values are updated correctly,
            // but arrays can be put but not patched.
            // TODO: massive rewrite?
            let resultPsalm = { // its type differs from the ordinary Psalm; maybe store it differently?
                ...inner(surah.origin),
                ...(surah.origin.proofs ? {proofs: [...surah.origin.proofs]} : {}),
                ...(surah.origin.contentMap ? {contentMap: {...surah.origin.contentMap}} : {})
            }

            // leaks 'from' field to other nodes!!!
            if (resultPsalm.proofs) {
                resultPsalm.ayat = []
                for (const ayah of resultPsalm.proofs) {
                    resultPsalm.ayat.push({...ayah, from: surah.origin.pid})
                }
            }

            for (const versionPsalm of surah.psalms) {
                const versionAyah = versionPsalm.proofs && versionPsalm.proofs.find(curAyah => curAyah.pid === surah.pid)
                if (versionAyah) { //there is no proof only if this is origin
                    if (verify(versionPsalm, versionAyah, surah.origin)) {
                        switch (versionAyah.type) {
                            case 'patch':
                                Object.assign(resultPsalm, inner(versionPsalm))

                                resultPsalm.ayat = resultPsalm.ayat || []
                                for (const curAyah of versionPsalm.proofs) {
                                    if (!surah.origin.proofs || !surah.origin.proofs.find(originalAyah => originalAyah.pid === curAyah.pid)) {
                                        // todo: decide if it is necessary or safe to push updating proofs
                                        resultPsalm.ayat.push({...curAyah, from: versionPsalm.pid})
                                    }
                                }
                                
                                if (resultPsalm.contentMap || versionPsalm.contentMap) {
                                    resultPsalm.contentMap = versionPsalm.contentMap && Object.keys(versionPsalm.contentMap).length > 0
                                        ? versionPsalm.contentMap
                                        : resultPsalm.contentMap // replaced only if the patch has new content map
                                }
                                Object.keys(resultPsalm).forEach(key => {
                                    if (resultPsalm[key] === '$delete') {
                                        delete resultPsalm[key] // somewhat hacky
                                    }
                                })
                                break
                            case 'put':
                                resultPsalm = {...inner(versionPsalm)}
                                resultPsalm.proofs = versionPsalm.proofs //are always replaced whole!
                                //todo: add from?
                                if (versionPsalm.contentMap) {
                                    resultPsalm.contentMap = versionPsalm.contentMap
                                }
                                break
                            case 'delete':
                                Object.assign(resultPsalm, {revoked: true})
                        }
                    } else {
                        console.error('Counterfeit proof in the post history', versionPsalm, versionAyah, surah.origin)
                    }
                }
            }
            surah.result = resultPsalm
        } else {
            //case 2: post has no proofs, so it must be new

            /*console.log("LOAD CHECK")
            console.log(psalm.directKey)
            console.log(microjson(inner(psalm)))
            console.log(bs58.encode( Buffer.from(microjson(inner(psalm))) ))
            console.log(bs58.encode(crypto.direct.signOrigin( Buffer.from(microjson(inner(psalm))) )))
            console.log(bs58.decode(psalm.directKey).equals(Buffer.from(crypto.direct.signOrigin( Buffer.from(microjson(inner(psalm))) ))))
            */

            surah = {
                pid: psalm.pid,
                psalms: [psalm],
                origin: psalm,
                //latest: psalm,
                result: {...psalm},
                //TODO: move to a separate file?
                my: bs58.decode(psalm.directKey).equals(      // Buffer
                    Buffer.from(                             // Buffer
                        crypto.direct.signOrigin(            // Uint8Array
                            asBuffer(psalm))))                // Buffer
            }
            // leaks 'from' field to other nodes!!!
            if (psalm.proofs) {
                surah.result.ayat = []
                for (const ayah of psalm.proofs) {
                    surah.result.ayat.push({...ayah, from: surah.pid})
                }
            }
            if (directSide) {
                Object.assign(surah, {to: post.to, encrypted: directSide})
            }
            suwar.push(surah)
        }
    } else {
        const minimalPost = {
            pid: post.pid,
            timestamp: post.timestamp,
            version: post.version
        }
        surah = {
            pid: post.pid,
            posts: [minimalPost],
            origin: minimalPost,
            //latest: minimalPost,
            result: minimalPost,
            my: false,
            to: post.to,
            encrypted: 'unknown'
        }
        //push to suwar?
    }
    suwar.sort(((a, b) => new Date(a.origin.timestamp) - new Date(b.origin.timestamp))) //ascending

    return surah
}

export default ayat
