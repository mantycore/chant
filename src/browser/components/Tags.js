import React from 'react'
import { connect } from 'react-redux'
import style from './Tags.css'

const Tags = ({tags}) => 
    <div className={style.tags}>{tags.map(([name, count]) =>
        <span><a href={`#/${name}/`} title={count}>/{name}/</a></span>
    )}</div>

export default connect(state => ({
    tags: [['~', state.suwar.length], ...Object.entries(state.suwar.reduce((acc, cur) => {
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
    }, {})).sort((a, b) => b[1] - a[1])]
}))(Tags)
