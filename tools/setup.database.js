const { Database } = require('./async.await.sqlite3.js')

async function main () {
    const db = await /* new */ Database('./chant.db')

    await db.run(`CREATE TABLE posts(
        pid TEXT PRIMARY KEY,
        opid TEXT,
        timestamp INTEGER NOT NULL,
        rest TEXT NOT NULL
    ) WITHOUT ROWID`)
    await db.run('CREATE UNIQUE INDEX pid_index ON posts(pid)')
    await db.run('CREATE INDEX posts_opid_index ON posts(opid)')
    await db.run('CREATE INDEX posts_timestamp_index ON posts(timestamp)')

    await db.run(`CREATE TABLE proofs(
        latter_pid TEXT NOT NULL,
        pid TEXT NOT NULL,
        signature TEXT NOT NULL,
        type TEXT NOT NULL,
        PRIMARY KEY (latter_pid, pid)
    )`)
    await db.run('CREATE INDEX proofs_latter_pid_index ON proofs(latter_pid)')
    await db.run('CREATE INDEX proofs_pid_index ON proofs(pid)')

    await db.run(`CREATE TABLE attachments(
        cid TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        buffer BLOB NOT NULL,
        rest STRING NOT NULL
    ) WITHOUT ROWID`)
    await db.run('CREATE INDEX attachments_cid_index ON attachments(cid)')
    await db.run('CREATE INDEX attachments_timestamp_index ON attachments(timestamp)')

    db.close()
}

main()