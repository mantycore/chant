const Unixfs = require('ipfs-unixfs')
const dagPB = require('ipld-dag-pb')
// import dagCBOR from 'ipld-dag-cbor'


// cid may differ from IPFS one for larger images, possibly because of chunking
async function toCID(rawData) {
    const data = Buffer.from(rawData) //, 'ascii'
    const unixFs = new Unixfs('file', data)
    const dagNode = await dagPB.DAGNode.create(unixFs.marshal())
    const serialized = dagPB.util.serialize(dagNode);
    const cid = await dagPB.util.cid(serialized, {cidVersion: 0})
    return cid.toBaseEncodedString()

    //hash = await multihashing(..., 'sha2-256')
    //new CID(0, 'dag-pb', hash).toBaseEncodedString())

    //const serialized = dagCBOR.util.serialize(dagNode);
    //const cid = await dagCBOR.util.cid(serialized)
}

module.exports = toCID