let filesToLoad = []

export default state => {
    document.getElementById('submit').addEventListener('click', (e) => {
        const body = document.getElementById('body').value
        state.putPost({body, filesToLoad}).then(cid => {
            document.getElementById('body').value = ''
            filesToLoad = []
            updateFileList()
        })
    })

     const dropzone = document.getElementById('drop_zone')
     
     dropzone.addEventListener('dragover', evt => {
        evt.stopPropagation()
        evt.preventDefault()
        evt.dataTransfer.dropEffect = 'copy'
     }, false)

     dropzone.addEventListener('drop', evt => {
        evt.stopPropagation()
        evt.preventDefault()
        filesToLoad = evt.dataTransfer.files
        updateFileList()
    })

    const dropzoneHelper = document.getElementById('drop_zone_helper')
    dropzone.addEventListener('click', evt => {
        evt.stopPropagation()
        evt.preventDefault()

        dropzoneHelper.click()
    })
    dropzoneHelper.addEventListener('change', evt => {
        filesToLoad = evt.target.files
        updateFileList()
    })

    function updateFileList() {
        const output = document.getElementById('files')

        while (output.firstChild) {
            output.removeChild(output.firstChild);
        }

        Array.from(filesToLoad).forEach(file => {
            const p = document.createElement('p')
            output.appendChild(p);

            [file.name, file.type, file.size].forEach(field => {
                const span = document.createElement('span')
                span.appendChild(document.createTextNode(field))
                p.appendChild(span)
            })
        })
    }
}
