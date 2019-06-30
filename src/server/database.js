import { Database } from 'Tools/async.await.sqlite3.js'

let db;

async function setup(state) {
    db = await Database('./chant.db')
    state.posts = (await db.all('SELECT * FROM posts ORDER BY timestamp'))
        .map(({pid, opid, timestamp, rest}) =>
            ({pid, opid, timestamp,...JSON.parse(rest)}))
    try {
        state.contentStore = new Map((await db.all('SELECT * FROM attachments'))
            .map(({cid, buffer, rest}) => {
                return [cid, {cid, buffer, ...JSON.parse(rest)}]
            }))
    } catch (err) {
        console.log(err)
    }
}

async function stateChangeHandler(type, payload) {
    switch (type) {
        case 'put post': {
            const {pid, opid, timestamp, ...rest} = payload.post
            await db.run(`
                INSERT
                    INTO posts(pid, opid, timestamp, rest)
                    VALUES (?, ?, ?, ?)`,
                    [pid, opid, timestamp, JSON.stringify(rest)])
            break
        }
        case 'put attachment': {
            const {buffer, ...rest} = payload.attachment
            await db.run(`
                INSERT
                    INTO attachments(cid, timestamp, rest, buffer)
                    VALUES (?, ?, ?, ?)`,
                    [payload.cid, new Date().getTime(), JSON.stringify(rest), buffer])
            break
        }
        case 'put peer':
        case 'delete peer':
            break
        default:
            console.log('Unknown storage action', type)
    }
}

export {
    setup,
    stateChangeHandler
}
