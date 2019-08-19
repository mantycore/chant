import { ofType, combineEpics } from 'redux-observable'
import { Observable } from 'rxjs'
import { map, filter, mergeMap, catchError } from 'rxjs/operators'
import decrypt from 'Surah/decrypt.js'
import ayat from 'Surah/ayah/'
import addSurahToRenga from 'Surah/renga.js'
export { Buffer } from 'buffer'
import nacl from 'tweetnacl'
import observableAsync from 'Common/observableAsync.js'

export default combineEpics(
    (action$, state$) => action$.pipe(
        ofType('prakriti poema put'),
        mergeMap(observableAsync(async (action, subscriber) => {
            const poema = action.poema
            const state = state$.value
            const {poemata, contents} = state.poema
            const {suwar, rengashu} = state.surah

            let psalm, directSide
            if (poema.to) {
                ({psalm, directSide} = decrypt(
                    poema,
                    suwar,
                    contents,
                    subscriber, // called as a effect, modifying contents
                ))
            } else {
                psalm = poema
            }

            const surah = await ayat(
                poema, // TODO: not needed, remove?
                psalm,
                directSide,
                suwar,
                poemata,
                state$
            )

            const renga = await addSurahToRenga(
                poema,
                psalm,
                surah,
                suwar,
                rengashu,
                state$
            )

            subscriber.next({type: 'prakriti surah put', surah, ...(renga ? {renga} : {})})
            subscriber.complete()
        }))
    ),

    (action$, state$) => action$.pipe(
        ofType('mantra incoming content'),
        filter(action => action.haiku),
        map(({cid, nid, content, haiku}) => {
            // was in decrypt
            const {psalm, cidPlain, secretKey, nonce} = haiku

            const contents = [
                ...(psalm.body ? [psalm.body] : []),
                ...(psalm.attachments ? psalm.attachments : [])
            ]
            const originalContent = contents.find(c => c.cid === cidPlain)
            const decryptedContentBuffer = Buffer.from(nacl.secretbox.open(content.buffer, nonce, secretKey))

            return {
                type: 'prakriti content put',
                cid: cidPlain,
                nid,
                payload: {...originalContent, buffer: decryptedContentBuffer},
                source: 'choir, decrypted'
            }
        })
    )
)
