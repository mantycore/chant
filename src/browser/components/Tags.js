import React from 'react'
import e from './createElement.js'
import { connect } from 'react-redux'

const Tags = ({tags}) => 
    e('div', {id: 'tags'}, tags.map(([name, count]) =>
        e('span', {},
           e('a', {href: `#/${name}/`, title: count}, `/${name}/`))))

export default connect(state => ({
    tags: [['~', state.postsAggregated.length], ...Object.entries(state.postsAggregated.reduce((acc, cur) => {
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
