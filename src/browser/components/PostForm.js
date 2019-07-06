import React, {useState, useRef} from 'react'
import e from './createElement.js'
import { connect } from 'react-redux'

const PostForm = ({state, dispatch}) => {
    const [filesToLoad, setFilesToLoad] = useState([])
    //const bodyRef = useRef(null)// instead of controlled attribute
    const helperRef = useRef(null)
    let placeholder, disabled, encrypted;
     
    let protoPost = {}
    if (state.initiation) {
        return e('div', {id: 'post_form_outer'}, [
            e('div', {id: 'post_form'}, [
                e('button', {onClick: dispatch.unlockPassword}, 'Enter your own'),
                e('input', {type: 'text', className: 'encrypted', value: state.secretCode, disabled: !state.passwordEditable, onChange: dispatch.changePassword}),
                e('button', {onClick: dispatch.acceptPassword}, 'Accept'),
            ]),
            e('div', {className: 'initiation-message'},
`This is your secret code. Please copy it, either electronically or by hand
(preferably both), and store it in secure locations. The code is the key to
all aspects of your identity on the Anoma Chant. If you lose it, you will not
have access to direct messages at the posts you created with it, and you
will be not able to prove that you are their author. The secret code is stored
only in the localStorage of your browser (you can revisit it by opening your
browser console by pressing F12, Ctrl\u00A0+\u00A0Shift\u00A0+\u00A0J, or\u00A0Cmd\u00A0+\u00A0Option\u00A0+\u00A0J, and entering
"localStorage.getItem('Secret code')") and cannot be restored by any outside party.`),
        ])
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
        const renga = state.rengashu.find(curRenga => curRenga.id === state.conversationId)
        protoPost.to = renga.suwar[0].my ? renga.secondPid : renga.firstPid // can fail if the conversation is malformed
        // think about it. What if both sides are mine?
        protoPost.conversationId = state.conversationId
        placeholder = `⚿ Encrypted direct message to ~${protoPost.to.substring(0, 8)} ⚿`
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
        const body = state.postBeingEdited.body //bodyRef.current.value
        
        if (state.postBeingEdited.mode === 'patch') {
            let post = {body} // so far, only post body can be updated
            await state.updatePost(post, state.postBeingEdited.post.origin, 'patch')
        } else {
            let post = {body, filesToLoad}
            Object.assign(post, protoPost)
            const pid = await state.putPost(post)

            if (state.postsMode === 'direct') {
                const path = window.location.hash.match('#(.*)')[1].split('/')
                path[3] = pid
                window.location.hash = path.slice(0,4).join('/')
            }
        }
        setFilesToLoad([])
        dispatch.submitSuccess()
        //bodyRef.current.value = ''
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

    const onKeyPress = event => {
        if (event.key === 'Enter' && (event.ctrlKey || event.shiftKey) ) {
            submit()
        }
    } 

    return e('div', {id: 'post_form_outer'}, [
        ...(Array.from(filesToLoad).length > 0 ? [
                e('div', {id: 'files'}, Array.from(filesToLoad).map(file =>
                    e('p', {}, [file.name, file.type, file.size].map(field =>
                        e('span', {}, field)))))
        ] : []),

        e('div', {id: 'post_form'}, [
            state.postBeingEdited.mode === 'patch'
            ? e('button', {onClick: dispatch.cancelUpdate}, 'Cancel')
            : e('div',
                {id: 'drop_zone', onDragOver, onDrop, onClick: proxy},
                'Drop files or click to upload'),
            e('textarea', {
                ...(encrypted ? {className: 'encrypted'} : {}),
                placeholder,
                disabled,
                //ref: bodyRef,
                onKeyPress,
                onChange: dispatch.bodyChange,
                value: state.postBeingEdited.body
            }),
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
        unlockPassword: () => dispatch({type: 'unlock password'}),
        changePassword: event => dispatch({type: 'change password', event}),
        acceptPassword: () => dispatch({type: 'accept password'}),

        bodyChange: event => dispatch({type: 'post body change', event}),
        submitSuccess: () => dispatch({type: 'post submit success'}),
        cancelUpdate: () => dispatch({type: 'cancel post update'}),
    }})
)(PostForm)
