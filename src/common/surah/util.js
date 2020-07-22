import { map, first, timeout } from 'rxjs/operators'

const cloneDeep = obj => (console.log(obj), JSON.parse(JSON.stringify(obj)))

const whenAvailable = async (state$, selector) => state$.pipe(
    timeout(1000),
    first(selector),
    map(selector)
).toPromise() //BIG HACK :(

export { whenAvailable, cloneDeep }
