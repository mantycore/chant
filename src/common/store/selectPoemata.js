// @flow
// @flow-runtime
import type { Prakriti } from './.flow/'
//import type { MantraWithId } from 'Mantra/.flow/'
import type { Poema, Haiku, To } from 'Psalm/.flow/'

const selectPoemata = (state: Prakriti, mantra: any /* fix flow*/): Array<Poema> => {
    let poemata = state.poema.poemata

    let params = mantra.params
    if (params) {
        // All of the selectors below may be implemented here, or may be implemented in the function
        // creating the req-poemata-get request, probably in Maya.

        // For each poema, it is also necessary to load all poemata having update ayah on it.

        // It is not possible to find poemata by ayah if it is encrypted,
        // so all updating poemata must be in the same renga as the updated one!
        // (Or we need to allow for update ayah to be stored in haiku unencrypted)

        // We also _could_ prefetch other kinds of ayah-linked poemata, posts referencing this with
        // hyperlinks or referenced by it; and maybe something more. (And also prefetch content!)
        switch (params.mode) {
            case 'tag':
                // If we are displaying a tag, it is necessary to have all (or newest N) o-psalms in the tag.
                // It is also possible to preload all sutras in the tag (or newest N); this must be handled not here,
                // but in the code placing req-poemata-get.
                poemata = poemata.filter((poema: Poema) =>
                    (Array.isArray(poema.tags) && poema.tags.includes(params.tag)))
            break
            case 'rengashu': {
                // To display conversations list, we want all the hokku and waki. It may be dificult to find just them.
                // The simplest thing is to find all haiku directed to plain psalms (but see above on subrengas)
                // It is also possible for user node to track rids and request only hokku + waki for specific rids;
                // but maybe it is easier to just store hokku + waki locally.

                // (It is also very ironic that hokku is the only unencrypted poema in renga; while haiku is an encrypted psalm.
                // Think about terminology better.)
                poemata = poemata.filter((poema: Poema) => 'to' in poema)
                const hokkushu = []
                for (const ku: Haiku of ((poemata: any): Array<Haiku>)) {
                    for (const to: To of ku.to) {
                        const hokku = state.poema.poemata.find(poema => to.pid === poema.pid)
                        if (hokku) { //TODO: dedup
                            hokkushu.push(hokku)
                        }
                    }
                }
                poemata = hokkushu.concat(poemata) //.concat(hokkushu)
            }
            break
            case 'sutra':
                // If we are displaying a sutra, we need all the psalms in the sutra (sharing the same opid)
                // For each of these psalms, it that psalms starts a sutra, we also need _that_ sutra.
                // For each of psalms of subsutra, we also need to know if there are further subsubsutra branches,
                // but not necessary its psalmoi; however, current logic doesnt' allow to transfer
                // this kind of metadata with the psalm.
                // We also want a parent tag(s?) or parent sutra (or only those suwar from
                // parent sutra which start a subsutra themselves)
                poemata = poemata.filter((poema: Poema) =>
                    (poema.opid && poema.opid === params.opid) || (poema.pid === params.opid))
            break
            case 'psalm':
                // If we are displaying a psalm (in sutra), we want its parent sutra (or, if it is a head in a sutra, then that sutra)
                // and all the related objects, see above.
            break
            case 'renga': {
                // If we are displaying a renga, or a psalm belonging to renga, we want all the haiku with the matching rid.
                // We also want the objects to display conversations list (see below). Maybe for renga psalms it is possible
                // to display some parallel of subsutras (maybe a fact that there is a direct (subdirect? subrenga?) directed at 
                // the renga psalm).
                const [_, hokkuId, wakiId] = params.rid.match(/\/([^/]+)\/direct\/([^/]+)/)
                poemata = poemata.filter((poema: any) => //TODO: fix flow
                    (poema.to && ((poema.to: Array<To>).find(to => to.pid === hokkuId)
                               || (poema.to: Array<To>).find(to => to.pid === wakiId)) ) ||
                    poema.pid === hokkuId || poema.pid === wakiId)
            }
            break
        }
    }
    return poemata
}

export default selectPoemata
