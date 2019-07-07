async function main() {
    const { Client } = require('pg')
    const client = new Client()

    await client.connect()

    await client.query(`CREATE TABLE posts(
        pid character varying(88) PRIMARY KEY,
        opid character varying(88),
        timestamp bigint NOT NULL,
        rest text NOT NULL
    )`)
    await client.query('CREATE UNIQUE INDEX pid_index ON posts (pid)')
    await client.query('CREATE INDEX posts_opid_index ON posts (opid)')
    await client.query('CREATE INDEX posts_timestamp_index ON posts(timestamp)')

    await client.query(`CREATE TABLE proofs(
        latter_pid character varying(88) NOT NULL,
        pid character varying(88) NOT NULL,
        signature character varying(88) NOT NULL,
        type character varying(24) NOT NULL,
        PRIMARY KEY (latter_pid, pid)
    )`)
    await client.query('CREATE INDEX proofs_latter_pid_index ON proofs(latter_pid)')
    await client.query('CREATE INDEX proofs_pid_index ON proofs(pid)')

    await client.query(`CREATE TABLE attachments(
        cid character(46) PRIMARY KEY,
        timestamp bigint NOT NULL,
        rest text NOT NULL
    )`)
    await client.query('CREATE INDEX attachments_cid_index ON attachments(cid)')
    await client.query('CREATE INDEX attachments_timestamp_index ON attachments(timestamp)')

    await client.end()
}

main()
