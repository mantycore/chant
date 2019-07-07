const { Database } = require('./async.await.sqlite3.js')
const { Client } = require('pg')
const { writeAttachment } = require('./files.js')

async function main() {
    try {
    const sqlite = await Database('./chant.db')
    const postgres = new Client()
    await postgres.connect();

    let res = await sqlite.all('SELECT pid, opid, timestamp, rest FROM posts ORDER BY timestamp')
    if (res) {
        for (const {pid, opid, timestamp, rest} of res) {
            // remove erroneously signed posts
            if (pid !== '3LBrLyV75trLhdncfYYznti82iZmQ2HAXEq2suU1sh4z5XGLCd8mK4kBccLZBxNKcAbmZtiW9bmcH9kX2bvsoQYK'
                && pid !== '57qu9z3dtC6soxFYEhPs1K5u2VKdqFTYgqYbSBr233fNFeKDpdyXDfpxchSgghYrL2n9XLsqu1koZWVKGbtSTCk5') {
                await postgres.query(`INSERT
                    INTO posts(pid, opid, timestamp, rest)
                    VALUES($1, $2, $3, $4)`, [pid, opid, timestamp, rest])
            }
        }
    }

     res = await sqlite.all('SELECT latter_pid, pid, signature, type FROM proofs')
     if (res) {
        for(const {latter_pid, pid, signature, type} of res) {
            await postgres.query(`INSERT
                INTO proofs(pid, opid, timestamp, rest)
                VALUES($1, $2, $3, $4)`, [latter_pid, pid, signature, type])
        }
    }

    res = await sqlite.all('SELECT cid, timestamp, buffer, rest FROM attachments')
    if (res) {
        for (const {cid, timestamp, buffer, rest} of res) {
            const json = JSON.parse(rest)
            await writeAttachment({cid, buffer, ...json})
            await postgres.query(`INSERT
                INTO attachments(cid, timestamp, rest)
                VALUES($1, $2, $3)`, [cid, timestamp, rest])
        }
    }

    await postgres.end()
    sqlite.close()
    } catch(e) {
        console.log(e)
    }
}

main()