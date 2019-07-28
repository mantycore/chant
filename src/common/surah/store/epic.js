import { ofType, combineEpics } from 'redux-observable'
import { Observable } from 'rxjs'
import { map, filter, mergeMap, catchError } from 'rxjs/operators'
import decrypt from 'Surah/v3/decrypt.js'
import ayat from 'Surah/v3/ayah/'
import addSurahToRenga from 'Surah/v3/renga.js'
export { Buffer } from 'buffer'
import nacl from 'tweetnacl'

export default combineEpics(
    (action$, state$) => action$.pipe(
        ofType('poema store from remote'), //TODO: other poema sources!
        mergeMap(action => new Observable(subscriber => {
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

            const surah = ayat(
                poema, // TODO: not needed, remove?
                psalm,
                directSide,
                suwar,
                poemata
            )

            const renga = addSurahToRenga(
                poema,
                psalm,
                surah,
                suwar,
                rengashu
            )

            subscriber.next({type: 'surah store', surah, ...(renga ? {renga} : {})})
        }))
    ),

    (action$, state$) => action$.pipe(
        ofType('mantra res content get'),
        filter(action => action.haiku),
        map(({cid, content, haiku}) => {
            const {psalm, cidPlain, secretKey, nonce} = haiku

            const contents = [
                ...(psalm.body ? [psalm.body] : []),
                ...(psalm.attachments ? psalm.attachments : [])
            ]
            const originalContent = contents.find(c => c.cid === cidPlain)
            const decryptedContentBuffer = Buffer.from(nacl.secretbox.open(content.buffer, nonce, secretKey))

            return {
                type: 'haiku content get',
                cid: cidPlain,
                content: {payload: {...originalContent, buffer: decryptedContentBuffer}}
            }
        })
    )
)
