import { ofType, combineEpics } from 'redux-observable'
import { Observable } from 'rxjs'
import { map, filter, mergeMap, catchError } from 'rxjs/operators'
import observableAsync from 'Common/observableAsync.js'
import process from 'process'

import { Client } from 'pg'
import { writeAttachment, readAttachment } from 'Tools/files.js'

export default combineEpics(
    (action$, state$) => action$.pipe(
        ofType('terma init'),
        mergeMap(observableAsync(async (action, subscriber) => {
            const postgres = new Client()
            await postgres.connect()

            for (const {pid, opid, timestamp, rest} of
                (await postgres.query('SELECT * FROM posts ORDER BY timestamp')).rows) {
                let poema = {pid, opid, timestamp: parseInt(timestamp),...JSON.parse(rest)}
                subscriber.next({type: 'prakriti poema put', poema, status: {source: 'terma'}}) //TODO: handle
            }

            for (const {cid, timestamp, rest} of
                (await postgres.query('SELECT * FROM attachments')).rows) {
                const json = JSON.parse(rest)
                const buffer = await readAttachment({cid, ...json}) //TODO: read only on request
                const payload = {cid, timestamp: parseInt(timestamp), buffer, ...json}
                subscriber.next({type: 'prakriti content put', cid, payload, status: {source: 'terma'}})
            }

            process.on('SIGTERM', async () => {
              console.info('SIGTERM signal received.')
              await postgres.end()
              process.exit(0)
            })

            subscriber.next({type: 'terma init complete', postgres})
            subscriber.complete()
        }))
    ),

    (action$, state$) => action$.pipe(
        ofType('terma init complete'),
        map(() => ({type: 'mantra init'}))
    ),

    (action$, state$) => action$.pipe(
        ofType('prakriti poema put'),
        filter(action => action.status.source !== 'terma'),
        map(action => ({type: 'terma poema put', poema: action.poema}))
    ),

    (action$, state$) => action$.pipe(
        ofType('prakriti content put'),
        filter(action => action.status.source !== 'terma'),
        map(action => ({type: 'terma content put', cid: action.cid, payload: action.payload}))
    ),

    (action$, state$) => action$.pipe(
        ofType('terma poema put'),
        mergeMap(async action => {
            const {pid, opid, timestamp, ...rest} = action.poema
            await state$.value.terma.postgres.query(`
                INSERT
                    INTO posts(pid, opid, timestamp, rest)
                    VALUES ($1, $2, $3, $4)`,
                    [pid, opid, timestamp, JSON.stringify(rest)])
            return {type: 'terma poema put complete'}
        })
    ),

    (action$, state$) => action$.pipe(
        ofType('terma content put'),
        mergeMap(async action => {
            const {buffer, ...rest} = action.payload
            await writeAttachment(action.payload)
            await state$.value.terma.postgres.query(`
                INSERT
                    INTO attachments(cid, timestamp, rest)
                    VALUES ($1, $2, $3)`,
                    [action.cid, new Date().getTime(), JSON.stringify(rest)])
            return {type: 'terma content put complete'}
        })
    )
)
