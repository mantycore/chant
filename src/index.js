import PeerRelay from 'peer-relay'
import messageHandler from './messageHandler.js'
import React, {useState} from 'react'
import ReactDOM from 'react-dom'

const state = {
    pr: new PeerRelay({bootstrap: ['wss://chant.anoma.li:7001']})
}

messageHandler(state)

Object.assign(window, state)

const e = React.createElement;

/*const Posts = () => {
	const [posts, setPosts] = useState([{body: 'hello'}])
	state.onStateChange(() => setPosts(state.posts))
	return e('div', null, posts.map(post => e('p', null, post.body)))
}*/
class Posts extends React.PureComponent {
    componentDidMount() {
    	state.onStateChange(() => this.forceUpdate())
    }
	render() {
		return e('div', null, this.props.posts.map(post => e('div', null, [
			e('p', {style: {fontSize: 10}}, post.pid),
			e('p', null, post.body),
            ...(post.files ? [

                e('p', {style: {display: 'flex', flexDirection: 'row'}}, post.files
                    .filter(file => file.type === 'image/png' || file.type === 'image/jpeg')
                    .filter(file => contentStore.has(file.cid))
                    .map(file => e('img', {
                        src: contentStore.get(file.cid).dataURL,
                        style: {maxHeight: 400, paddingRight: 10} // todo: find a cleaner way to align them
                    })))

            ] : [])
		])))
	}
}
const res = ReactDOM.render(e(Posts, {posts: state.posts}), document.getElementById('main'))

let filesToLoad = []
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