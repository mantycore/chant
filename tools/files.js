const shell = require('shelljs')
const fs = require('fs')
const util = require('util')

async function writeAttachment({cid, name, type, buffer}) {
    const path = `content/${type}/${cid.substring(2, 4)}` //maybe find a way to save type in the path
    shell.mkdir('-p', path)
    await util.promisify(fs.writeFile)(`${path}/${cid}.${name}`, buffer)
}

async function readAttachment({cid, name, type}) {
    const path = `content/${type}/${cid.substring(2, 4)}`
    return await util.promisify(fs.readFile)(`${path}/${cid}.${name}`)
}

module.exports = { writeAttachment, readAttachment }