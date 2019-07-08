//import pg from 'pg'
//const Client = pg.Client
const { Client } = require('pg')
const { writeAttachment, readAttachment } = require('Tools/files.js')

let postgres;

async function setup(state) {
    postgres = new Client()
    await postgres.connect();

    state.poemata = []
    for (const {pid, opid, timestamp, rest} of
        (await postgres.query('SELECT * FROM posts ORDER BY timestamp')).rows) {
        state.poemata.push({pid, opid, timestamp: parseInt(timestamp),...JSON.parse(rest)})
    }

    let content = [];
    for (const {cid, timestamp, rest} of
        (await postgres.query('SELECT * FROM attachments')).rows) {
        const json = JSON.parse(rest)
        const buffer = await readAttachment({cid, ...json}) //TODO: read only on request
        content.push([cid, {cid, timestamp: parseInt(timestamp), buffer, ...json}])
    }
    state.contentStore = new Map(content)
}

process.on('SIGTERM', async () => {
  console.info('SIGTERM signal received.')
  await postgres.end()
  process.exit(0)
});

async function stateChangeHandler(type, payload) {
    switch (type) {
        case 'put post': {
            const {pid, opid, timestamp, ...rest} = payload.post
            await postgres.query(`
                INSERT
                    INTO posts(pid, opid, timestamp, rest)
                    VALUES ($1, $2, $3, $4)`,
                    [pid, opid, timestamp, JSON.stringify(rest)])
        }
        break
        case 'put attachment': {
            if (payload.attachment.private) {
                // Do not save decrypted content.
                // Currently nodes that can write to database can't decrypt posts,
                // but this is a possibility in future.
                return
            }
            const {buffer, ...rest} = payload.attachment
            await writeAttachment(payload.attachment)
            await postgres.query(`
                INSERT
                    INTO attachments(cid, timestamp, rest)
                    VALUES ($1, $2, $3)`,
                    [payload.cid, new Date().getTime(), JSON.stringify(rest)])
        }
        break
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
