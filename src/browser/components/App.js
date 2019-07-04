import React from 'react'
import e from './createElement.js'
import { connect } from 'react-redux'

import Status from './Status.js'
import Tags from './Tags.js'
import Posts from './Posts.js'
import PostForm from './PostForm.js'

const App = ({state}) => e('div', {id: 'app'}, [
    e('div', {id: 'top'}, [e(Tags), e(Status)]),
    (state.displaySplash
        ? e('div', {className: 'splash'}, [
            'Querying the Cosmos',
            'Listening to the Universe',
            'Attuning to the flows of Aether',
            'Observing the signs',
            'Reading the tea leaves',
            'Contemplating the patterns of clouds',
            'Stargazing',
            'Discerning the distant din'
            ][Math.floor(Math.random() * 8)])
        : e(Posts)
    ),
    e(PostForm)
])

export default connect(state => ({state}))(App)