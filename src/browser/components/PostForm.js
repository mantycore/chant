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
        if (state.postsMode === 'direct') {
            post.to = state.opost.pid
        }
        if (state.postsMode === 'thread') {
            post.opid = state.opost.pid
        } else if (state.postsMode === 'tag') {
            post.tags = [state.tag]
        }
        await state.putPost(post)
        setFilesToLoad([])
        bodyRef.current.value = ''
        //hack
        const postDiv = document.getElementById('posts')
        postDiv.scrollTop = postDiv.scrollHeight - postDiv.clientHeight; 
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

    return e('div', {id: 'post_form_outer'}, [
        ...(Array.from(filesToLoad).length > 0 ? [
                e('div', {id: 'files'}, Array.from(filesToLoad).map(file =>
                    e('p', {}, [file.name, file.type, file.size].map(field =>
                        e('span', {}, field)))))
        ] : []),

        e('div', {id: 'post_form'}, [

            e('div',
                {id: 'drop_zone', onDragOver, onDrop, onClick: proxy},
                'Drop files or click to upload'),
            e('textarea', {ref: bodyRef}),
            e('button', {onClick: submit}, 'Post'),
            e('input', {
                type: "file",
                ref: helperRef,
                onChange: helperChange,
                multiple: true,
                style: {display: 'none'}})
        ])
    ])
}

export default connect(state => ({state}))(PostForm)
