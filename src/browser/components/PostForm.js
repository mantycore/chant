import React, {useState, useRef} from 'react'
import e from './createElement.js'
import { connect } from 'react-redux'

const PostForm = ({state, dispatch}) => {
    const [filesToLoad, setFilesToLoad] = useState([])
    const bodyRef = useRef(null)// instead of controlled attribute
    const helperRef = useRef(null)
    let placeholder, disabled, encrypted;
     
    let protoPost = {}
    if (state.postsMode === 'initiation') {
        return e('div', {id: 'post_form_outer'},
            e('div', {id: 'post_form'}, [
                e('button', {onClick: dispatch.changePassword}, 'Change'),
                e('textarea', {className: 'encrypted', value: state.masterPassword, disabled: !state.paswordEditable, onChange: dispatch.editPassword}),
                e('button', {onClick: dispatch.acceptPassword}, 'Accept'),
            ])
        )
    }
    if (state.postsMode === 'directs list') {
        placeholder = `⚿ List of your direct conversations ⚿`
        disabled = true
        encrypted = true
    }
    if (state.postsMode === 'direct') {
        protoPost.to = state.opost.pid
        placeholder = `⚿ Encrypted direct message to ~${protoPost.to.substring(0, 8)} ⚿`
        encrypted = true
    }
    if (state.postsMode === 'direct conversation') {
        const conversation = state.conversations.find(conv => conv.id === state.conversationId)
        protoPost.to = conversation.posts[0].my ? conversation.secondPid : conversation.firstPid // can fail if the conversation is malformed
        // think about it. What if both sides are mine?
        protoPost.conversationId = state.conversationId
        placeholder = `⚿ Encrypted direct message to ~${protoPost.opid.substring(0, 8)} ⚿`
        encrypted = true
    }
    if (state.postsMode === 'thread') {
        protoPost.opid = state.opost.pid
        placeholder = `Public message in reply to ~${protoPost.opid.substring(0, 8)}`
        encrypted = false
    } else if (state.postsMode === 'tag') {
        protoPost.tags = [state.tag]
        placeholder = `Public message to /${protoPost.tags.join('/')}/`
        encrypted = false
    } else if (state.postsMode === 'tilde') {
        placeholder = `List of all messages you have access to`
        disabled = true
        encrypted = false
    }


    const submit = async e => {
        const body = bodyRef.current.value
        let post = {body, filesToLoad}
        Object.assign(post, protoPost)
        
        const pid = await state.putPost(post)

        if (state.postsMode === 'direct') {
            const path = window.location.hash.match('#(.*)')[1].split('/')
            path[3] = pid
            window.location.hash = path.slice(0,4).join('/')
        }
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
            e('textarea', {...(encrypted ? {className: 'encrypted'} : {}), placeholder, disabled, ref: bodyRef}),
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

export default connect(
    state => ({state}),
    dispatch => ({dispatch: {
        editPassword: () => dispatch({type: 'edit password'})
        changePassword: value => dispatch({type: 'change password', value})
        acceptPassword: () => dispatch({type: 'accept password'})
    }})
)(PostForm)
