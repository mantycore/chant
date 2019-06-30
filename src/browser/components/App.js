import React from 'react'
import e from './createElement.js'
import Status from './Status.js'
import Tags from './Tags.js'
import Posts from './Posts.js'
import PostForm from './PostForm.js'

export default () => e('div', {id: 'app'}, [
    e('div', {id: 'top'}, [e(Tags), e(Status)]),
    e(Posts),
    e(PostForm)
])
