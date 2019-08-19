import React, {useRef} from 'react'
import { connect } from 'react-redux'
import style from './index.css'

const PostForm = ({state, dispatch}) => {
    //const bodyRef = useRef(null)// instead of controlled attribute
    const helperRef = useRef(null)
    let placeholder, disabled, encrypted;
     
    let protoPost = {}
    if (state.init.initiation) {
        return <div className={style["post-form-outer"]}>
            <div className={style["post-form"]}>
                <button onClick={dispatch.unlockPassword}>Enter your own</button>
                <input {...{type: 'text', className: style['encrypted'], value: state.init.secretCode, disabled: !state.passwordEditable, onChange: dispatch.changePassword}} />
                <button onClick={dispatch.acceptPassword}>Accept</button>
            </div>
            <div className={style["initiation-message"]}>{
`This is your secret code. Please copy it, either electronically or by hand
(preferably both), and store it in secure locations. The code is the key to
all aspects of your identity on the Anoma Chant. If you lose it, you will not
have access to direct messages at the posts you created with it, and you
will be not able to prove that you are their author. The secret code is stored
only in the localStorage of your browser (you can revisit it by opening your
browser console by pressing F12, Ctrl\u00A0+\u00A0Shift\u00A0+\u00A0J, or\u00A0Cmd\u00A0+\u00A0Option\u00A0+\u00A0J, and entering
"localStorage.getItem('Secret code')") and cannot be restored by any outside party.`
            }</div>
        </div>
    }
    if (state.maya.mode === 'directs list') {
        placeholder = `⚿ List of your direct conversations ⚿`
        disabled = true
        encrypted = true
    }
    if (state.maya.mode === 'direct') {
        protoPost.to = state.maya.sutraPid
        placeholder = `⚿ Encrypted direct message to ~${protoPost.to.substring(0, 8)} ⚿`
        encrypted = true
    }
    if (state.maya.mode === 'direct conversation') {
        const renga = state.surah.rengashu.find(curRenga => curRenga.id === state.maya.rengaId)
        if (renga) {
            protoPost.to = renga.suwar[0].my ? renga.secondPid : renga.firstPid // can fail if the conversation is malformed
            // think about it. What if both sides are mine?
            protoPost.conversationId = state.maya.rengaId
            placeholder = `⚿ Encrypted direct message to ~${protoPost.to.substring(0, 8)} ⚿`
            encrypted = true
        } else {
            placeholder = 'Waiting for conversation to load'
            disabled = true
        }
    }
    if (state.maya.mode === 'thread') {
        protoPost.opid = state.maya.sutraPid
        placeholder = `Public message in reply to ~${protoPost.opid.substring(0, 8)}`
        encrypted = false
    } else if (state.maya.mode === 'tag') {
        protoPost.tags = [state.maya.tag]
        placeholder = `Public message to /${protoPost.tags.join('/')}/`
        encrypted = false
    } else if (state.postsMode === 'tilde') {
        placeholder = `List of all messages you have access to`
        disabled = true
        encrypted = false
    }

    const onDragOver = e => {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy'
    }

    const onDrop = e => {
        e.stopPropagation()
        e.preventDefault()
        dispatch.setFilesToLoad(e.dataTransfer.files)
    }

    const proxy = e => {
        helperRef.current.click()
    }

    const helperChange = e => {
        dispatch.setFilesToLoad(e.target.files)
    }

    const onKeyPress = event => {
        if (event.key === 'Enter' && (event.ctrlKey || event.shiftKey) ) {
            submit()
        }
    }

    const submit = () => {
        dispatch.submit({protoPost})
    }

    return <div className={style["post-form-outer"]}>
        {Array.from(state.filesToLoad).length > 0 ? 
            <div className={style["files"]}>{Array.from(state.filesToLoad).map(file =>
                <p>{[file.name, file.type, file.size].map(field =>
                    <span>{field}</span>
                )}</p>
            )}</div>
        : []}

        <div className={style["post-form"]}>
            {state.postBeingEdited.mode === 'patch'
                ? <button onClick={dispatch.cancelUpdate}>Cancel</button>
                : <div {...{className: style['drop-zone'], onDragOver, onDrop, onClick: proxy}}
                >Drop files or click to upload</div>
            }
            <textarea {...{
                ...(encrypted ? {className: style['encrypted']} : {}),
                placeholder,
                disabled,
                //ref: bodyRef,
                onKeyPress,
                onChange: dispatch.bodyChange,
                value: state.postBeingEdited.body
            }} />
            <button onClick={submit}>Post</button>
            <input {...{
                type: "file",
                ref: helperRef,
                onChange: helperChange,
                multiple: true,
                style: {display: 'none'}}} />
        </div>
    </div>
}

export default connect(
    state => ({
        state: {
            ...state,
            filesToLoad: state.newState.postForm.filesToLoad
        }
    }),
    dispatch => ({dispatch: {
        unlockPassword: () => dispatch({type: 'react post-form unlock password'}), // react post-form#password unlock
        changePassword: event => dispatch({type: 'react post-form change password', event}), // react post-form#password change
        acceptPassword: () => dispatch({type: 'react post-form accept password'}), // // react post-form#password accept

        bodyChange: event => dispatch({type: 'post body change', event}), // react post-form body change

        setFilesToLoad: files => dispatch({type: 'react post-form files change', files}),
        submit: params => dispatch({type: 'react post-form submit', ...params}),
        submitSuccess: () => dispatch({type: 'post submit success'}), // -> epic
        cancelUpdate: () => dispatch({type: 'cancel post update'}), // react post-form#update cancel
    }})
)(PostForm)
