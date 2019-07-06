import toCID from 'Common/cid.js'

// used only in Maya (so far?)
const processFiles = async(filesToLoad) => {
    const pFileReader = method => file => new Promise((resolve, reject) => {
        const fileReader = new FileReader()
        fileReader.onload = resolve
        fileReader[method](file)
    })

    let attachments = []
    let filesFull = []
    if (filesToLoad) {
        const arrayBufferReaders = await Promise.all(Array.from(filesToLoad).map(pFileReader('readAsArrayBuffer')))
        const arrayBuffers = arrayBufferReaders.map(event => event.target.result)  // change to Buffers, check if the result is the same
        const cids = await Promise.all(arrayBuffers.map(toCID))

        //const dataURLReaders = await Promise.all(Array.from(filesToLoad).map(pFileReader('readAsDataURL')))
        //const dataURLs = dataURLReaders.map(event => event.target.result)

        //filesFull = Array.from(filesToLoad).map((file, i) => ({dataURL: dataURLs[i], cid: cids[i], type: file.type, name: file.name, size: file.size})) // size, lastModified
       
        const buffers = arrayBuffers.map(arrayBuffer => Buffer.from(arrayBuffer))
            filesFull = Array.from(filesToLoad).map((file, i) => ({buffer: buffers[i], cid: cids[i], type: file.type, name: file.name, size: file.size})) // size, lastModified
       
        attachments = Array.from(filesToLoad).map((file, i) => ({cid: cids[i], type: file.type, name: file.name, size: file.size})) // size, lastModified
    }
    return [filesFull, attachments]
}

export default processFiles
