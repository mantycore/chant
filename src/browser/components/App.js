import React, {useState} from 'react'
import { connect } from 'react-redux'

import Status from './Status.js'
import Tags from './Tags.js'
import Posts from './Posts.js'
import PostForm from './PostForm.js'
import Splash from './Splash.js'

import style from './App.css'

const App = ({state}) => (
    <div className={style.app}>
        <div className={style.top}><Tags /><Status /></div>
        {state.displaySplash
            ? <Splash />
            : <Posts />
        }
        <PostForm />
    </div>
)

export default connect(state => ({state}))(App)