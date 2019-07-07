const shell = require('shelljs')
const fs = require('fs')
const util = require('util')

async function writeAttachment({cid, name, type, buffer}) {
    //const sanitizedType = type.replace(/[^-a-zA-Z0-9.;+/]/g, '~')
    // TODO check what characters are allowed in media type and what are safe to use here
    const path = `content/${type}/${cid.substring(2, 4)}`
    shell.mkdir('-p', path) // replace with mkdirp?
    await util.promisify(fs.writeFile)(`${path}/${cid}.${name}`, buffer)
}

async function readAttachment({cid, name, type}) {
    const path = `content/${type}/${cid.substring(2, 4)}`
    return await util.promisify(fs.readFile)(`${path}/${cid}.${name}`)
}

module.exports = { writeAttachment, readAttachment }