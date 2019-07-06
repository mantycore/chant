import decrypt from './decrypt.js'
import ayat from './ayah/'
import addSurahToRenga from './renga.js'

const aggregate = (
    payload, // Psalm | Haiku
    suwar,
    contentStore,
    getStateChangeHandler,
    rengashu,
    getAndStoreContent
) => {
    let psalm, directSide
    if (payload.to) {
        ({psalm, directSide} = decrypt(
            payload,
            suwar,
            contentStore, // modified as a effect
            getStateChangeHandler, // called as a effect
            getAndStoreContent
        ))
    } else {
        psalm = payload
    }

    const surah = ayat(
        payload, // TODO: not needed, remove?
        psalm,
        directSide,
        suwar // modified as a effect
    )

    addSurahToRenga(
        payload,
        psalm,
        surah,
        suwar,
        rengashu // modifies as a effect
    )

    return surah
}

export default aggregate
