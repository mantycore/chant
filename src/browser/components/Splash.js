import React from 'react'
import style from './Splash.css'

export default () => <div className={style.splash}>{[
    'Querying the Cosmos',
    'Listening to the Universe',
    'Attuning to the flows of Aether',
    'Observing the signs',
    'Reading the tea leaves',
    'Contemplating the patterns of clouds',
    'Stargazing',
    'Discerning the distant din'
    ][Math.floor(Math.random() * 8)]}</div>
