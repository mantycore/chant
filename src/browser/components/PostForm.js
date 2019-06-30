import React, {useState, useRef} from 'react'
import e from './createElement.js'
import { connect } from 'react-redux'

const PostForm = ({state}) => {
    const [filesToLoad, setFilesToLoad] = useState([])
    const bodyRef = useRef(null)// instead of controlled attribute
    const helperRef = useRef(null)

    const submit = async e => {
        const body = bodyRef.current.value
        let post = {body, filesToLoad}
        if (state.postsMode === 'thread') {
            post.opid = state.opost.pid
        } else if (state.postsMode === 'tag') {
            post.tags = [state.tag]
        }
        await state.putPost(post)
        setFilesToLoad([])
        bodyRes.current.value = ''
    }

    const onDragOver = e => {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy'
    }

    const onDrop = e => {
        e.stopPropagation()
        e.preventDefault()
        setFilesToLoad(e.dataTransfer.files)
    }

    const proxy = e => {
        helperRef.current.click()
    }

    const helperChange = e => {
        setFilesToLoad(e.target.files)
    }

    return e('div', {id: 'post_form'}, [
        e('textarea', {ref: bodyRef}),
        e('button', {onClick: submit}, 'Post'),
        e('div', {id: 'files'}, Array.from(filesToLoad).map(file =>
            e('p', {}, [file.name, file.type, file.size].map(field =>
                e('span', {}, field))))),
        e('div',
            {id: 'drop_zone', onDragOver, onDrop, onClick: proxy},
            'Drop files here'),
        e('input', {
            type: "file",
            ref: helperRef,
            onChange: helperChange,
            multiple: true,
            style: {display: 'none'}})
    ])
}

export default connect(state => ({state}))(PostForm)
