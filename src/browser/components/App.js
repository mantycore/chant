import React, {useState} from 'react'
import e from './createElement.js'
import { connect } from 'react-redux'

import Status from './Status.js'
import Tags from './Tags.js'
import Posts from './Posts.js'
import PostForm from './PostForm.js'
import Splash from './Splash.js'

/*
const App = ({state}) => {
    const [tag, updateTag] = useState(null)
    const [thread, updateThread] = useState(null)

    const tags = Object.entries(state.postsAggregated.reduce((acc, cur) => {
        if ('tags' in cur.result) {
            cur.result.tags.forEach(tag => {
                if (tag in acc) {
                    acc[tag] += 1
                } else {
                    acc[tag] = 1
                }
            })
        }
        return acc
    }, {}))

    let threads = null
    if (tag) {
        threads = state.postsAggregated.filter(post => post.result.tags && post.result.tags.includes(tag)) // TODO: sort on the latest comment in the thread = bump (if not sage)
    }

    let posts = null
    if (thread) {
        posts = state.postsAggregated.filter(post => post.result.opid === thread)
    }

    return e('div', {className: 'chant', style: {display: 'flex', height: '100vh'}}, [ // main
        e('div', {style: {width: '9em'}}, tags.map(tag => e('div', {onClick: () => updateTag(tag[0])}, tag[0]))), // tags
        e('div', {style: {width: '12em'}}, threads ? threads.map(thread => e('div', {onClick: () => updateThread(thread.pid), style: {marginBottom: '3em'}},
            [thread.pid.substring(0, 8), ' ', thread.result.body && thread.result.body.text.substring(0, 18)])) : "Threads placeholder"), // threads
        e('div', {style: {flexGrow: 1, display: 'flex', flexDirection: 'column'}}, [ // thread
            e('div', {}, "OP"), // thread meta/op
            e('div', {style: {flexGrow: 1}}, posts ? posts.map(post => e('div', {style: {marginBottom: '3em'}},
                [post.pid.substring(0, 8), ' ', post.result.body && post.result.body.text])) : "Posts placeholder"), // thread replies/posts
            e('div', {}, "Post form") // post form
        ])
    ])
}
*/


/*const App = ({state}) =>  e('div', {id: 'app'}, [
    e('div', {id: 'top'}, [e(Tags), e(Status)]),
    (state.displaySplash
        ? e(Splash)
        : e(Posts)
    ),
    e(PostForm)
])*/
const App = ({state}) => (
    <div id="app">
        <div id="top"><Tags /><Status /></div>
        {state.displaySplash
            ? <Splash />
            : <Posts />
        }
        <PostForm />
    </div>
)

export default connect(state => ({state}))(App)