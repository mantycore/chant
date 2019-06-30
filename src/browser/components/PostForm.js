import React, {useState, useRef} from 'react'
import e from './createElement.js'
import { connect } from 'react-redux'

const PostForm = ({state}) => {
    const [filesToLoad, setFilesToLoad] = useState([])
    console.log("FILES TO LOAD", filesToLoad)
    const bodyRef = useRef(null)// instead of controlled attribute
    const helperRef = useRef(null)

    const submit = async e => {
        const body = bodyRef.current.value
        await state.putPost({body, filesToLoad})
        setFilesToLoad([])
        bodyRed.current.value = ''
    }

    const onDragOver = e => {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy'
    }

    const onDrop = e => {
        console.log("onDrop")
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

    return e('div', {}, [
        e('textarea', {ref: bodyRef}),
        e('button', {onClick: submit}, 'Post'),
        e('div', {id: 'files'}, Array.from(filesToLoad).map(file =>
            e('p', {}, [file.name, file.type, file.size].map(field =>
                e('span', {}, field))))),
        e('div', {id: 'drop_zone', onDragOver, onDrop, onClick: proxy}, 'Drop files here'),
        e('input', {
            type: "file",
            ref: helperRef,
            onChange: helperChange,
            multiple: true,
            style: {display: 'none'}})
    ])
}

export default connect(state => ({state}))(PostForm)
