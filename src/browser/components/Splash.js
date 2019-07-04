import React from 'react'
import e from './createElement.js'

export default () => e('div', {className: 'splash'}, [
    'Querying the Cosmos',
    'Listening to the Universe',
    'Attuning to the flows of Aether',
    'Observing the signs',
    'Reading the tea leaves',
    'Contemplating the patterns of clouds',
    'Stargazing',
    'Discerning the distant din'
    ][Math.floor(Math.random() * 8)])