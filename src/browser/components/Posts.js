import React, {useRef, useEffect} from 'react'
import e from './createElement.js'
import { connect } from 'react-redux'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt()

const format = size =>
    size > Math.pow(1024, 4)
    ? `${(size/Math.pow(1024, 4)).toLocaleString("en", {maximumFractionDigits: 1})} TiB`
    : size > Math.pow(1024, 3)
    ? `${(size/Math.pow(1024, 3)).toLocaleString("en", {maximumFractionDigits: 1})} GiB`
    : size > Math.pow(1024, 2)
    ? `${(size/Math.pow(1024, 2)).toLocaleString("en", {maximumFractionDigits: 1})} MiB`
    : size > 1024
    ? `${(size/1024).toLocaleString("en", {maximumFractionDigits: 1})} KiB`
    : `${size} bytes`;


const urlCreator = window.URL || window.webkitURL
/*const binaryToUrl = (binary, type) => {
    console.log(binary, type)
    const url = urlCreator.createObjectURL(new Blob([binary], {type}))
    console.log('URL', url)
}*/

function Uint8ToB64String(u8a){
  var CHUNK_SZ = 0x8000;
  var c = [];
  for (var i=0; i < u8a.length; i+=CHUNK_SZ) {
    c.push(String.fromCharCode.apply(null, u8a.subarray(i, i+CHUNK_SZ)));
  }
  return c.join("");
}

const binaryToUrl = (binary, type) => `data:${type};base64,${btoa(Uint8ToB64String(binary))}`

const Image = ({attachment, state, dispatch}) => 
    state.contentStore.has(attachment.cid)
        ? e('img', {
            src: binaryToUrl(state.contentStore.get(attachment.cid).buffer, attachment.type),
            style: {maxHeight: 400, paddingRight: 10} // todo: find a cleaner way to align them
        })
        : e('div', {
            onClick: dispatch.downloadAttachment(attachment.cid, state),
            style: {
                height: 400,
                width: 300,
                marginRight: 10,
                backgroundColor: '#aaa',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            }
        },
        [
            e('p', null, attachment.type),
            e('p', null, format(attachment.size)),
            e('p', null, state.attachmentIsLoading[attachment.cid] === 'loading'
                ? 'Loading'
                : state.attachmentIsLoading[attachment.cid] === 'fail'
                ? 'Failed to load'
                : 'Click to load')
        ])

const Attachments = ({attachments, state, dispatch}) =>
    e('div', {style: {display: 'flex', flexDirection: 'row', marginBottom: 16}}, attachments
        .filter(attachment => attachment.type === 'image/png' || attachment.type === 'image/jpeg')
        .map(attachment => e(Image, {attachment, state, dispatch})))

const MiniPost = ({post, state, dispatch}) => {

}

const Post = ({post, state, dispatch, mini = false, conversation = null}) => {
    const updateProof = post.latest.proofs && post.latest.proofs.find(proof => proof.type === 'delete' || proof.type === 'put')
    const revoked = updateProof && updateProof.type === 'delete'
    const thread = conversation
        ? conversation.posts.slice(1)
        : state.postsAggregated.filter(threadPost =>
            threadPost.latest.opid === post.pid)
    console.log(post.pid, conversation, conversation ? `#${conversation.id}` : `#/${post.pid}`)
    return e('div', {}, [
        e('div', {className: [
                'post',
                ...(revoked ? ['revoked'] : []),
                ...(post.my ? ['my'] : [])
            ].join(' ')}, [
            e('div', {className: 'meta'}, [
                e('span', {style: {flexGrow: 1}}, 
                    e('a', {
                        href: conversation ? `#${conversation.id}` : `#/${post.pid}`
                    }, [
                        post.pid.substring(0, 8),
                        ' ',
                        new Date(post.latest.timestamp).toISOString() //TODO: latest AND initial timestamp for modified posts
                    ])),
                ...(revoked ? ['POST REVOKED'] : [ //TODO: see history?
                    ...(post.my ? [
                        e('span', {className: 'action', onClick: dispatch.update(post.origin, state)}, 'Update'),
                        '\u00A0',
                        e('span', {className: 'action', onClick: dispatch.revoke(post.origin, state)}, 'Revoke'),
                    ] : []),
                    '\u00A0',
                    e('span', {}, e('a', {href: `#/${post.pid}/direct`}, 'Direct')),
                    '\u00A0',
                    e('span', {className: 'action', onClick: () => { console.log(post) }}, 'Dump'),
                ])
            ]),
            ...(revoked ? [] : [
                ...(post.latest.body ? [e('div', {className: 'body', dangerouslySetInnerHTML: {__html: md.render(post.latest.body.text)}})] : []),
                ...(post.latest.attachments ? [e(Attachments, {attachments: post.latest.attachments, state, dispatch})] : []),
            ])
        ]),
        ...(!mini && thread.length > 0 ? [e('div', {className: 'thread'}, thread.length > 3 ? [
                e(Post, {post: thread[0], state, dispatch, mini: 'true', conversation}),
                e('div', {className: 'more'}, e('a', {
                    href: conversation ? `#${conversation.id}` : `#/${post.pid}`
                }, `${thread.length - 2} more post(s)`)),
                e(Post, {post: thread[thread.length-1], state, dispatch, mini: 'true', conversation}),
            ] : [thread.map(threadPost => e(Post, {post: threadPost, state, dispatch, mini: 'true', conversation}))]
            )] : [])
    ])
}



const Posts = ({state, dispatch}) => {
    const findReplies = post => state.postsAggregated.filter(pa =>
        pa.to && pa.to.filter(to => to.pid === post.pid).length > 0)
    /*const findRepliesRecursively = post => {
        const replies = findReplies(post)
        return replies.concat(...replies.map(findRepliesRecursively))
    }*/
    const findConversation = conversationId => state.postsAggregated.filter(pa =>
        pa.conversationId === conversationId)

    let posts = [...state.postsAggregated]
    let oPost = null
    if (state.postsMode === 'directs list') {
        //roundabout due to conversations strucure, rewrite
        return e('div', {id: 'posts'}, state.conversations.map(conversation => {
            const first = conversation.posts.find(post => post.pid === conversation.firstPid)
            return [
                e(Post, {post: first, state, dispatch, mini: false, conversation}),
            ]
        }))
    }
    if (state.postsMode === 'tag') {
        posts = posts.filter(post => post.latest.tags && post.latest.tags.includes(state.tag))
    } else if (state.postsMode === 'thread') {
        oPost = state.opost;
        posts = state.postsAggregated.filter(post =>
            post.latest.opid === state.opost.pid)
    } else if (state.postsMode === 'direct') {
        oPost = state.opost // sort
        posts = []
        //posts = findReplies(oPost)
    } else if (state.postsMode === 'direct conversation') {
        const conversation = state.conversations.find(conversation => conversation.id === state.conversationId)
        if (conversation) {
            [oPost, ...posts] = conversation.posts
        } else {
            return e('div', {id: 'error'}, "Conversation is not found or is not accessible")
        }
    }
    //const ref = useRef(null)
    //useEffect((e) => { console.log(ref); ref.current.scrollTop = ref.current.scrollHeight - ref.current.clientHeight; }, [posts])
    return e('div', {id: 'posts'}, [
        ...(oPost ? [e('div', {id: 'opost'}, e(Post, {post: oPost, state, dispatch, mini: true}))] : []),
        e('div', {}, posts.map(post => e(Post, {post, state, dispatch})))
    ])
}

export default connect(
    state => ({state}),
    dispatch => ({dispatch: {
        downloadAttachment: (cid, state) => async () => {
            dispatch({type: 'attachment load start', cid})
            try {
                await state.getAndStoreContent(cid)
                dispatch({type: 'attachment load success', cid})
            } catch (error) {
                console.log(error);
                dispatch({type: 'attachment load fail', cid})
            }
        },
        revoke: (post, state) => () => state.revoke(post), //if it is safe to pass post instead of pid?
        update: (post, state) => () => state.revoke(post)
    }})
)(Posts)
