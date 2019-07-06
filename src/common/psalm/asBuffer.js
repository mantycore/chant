import { Buffer } from 'buffer'
import { inner } from 'Common/createPost.js' // psalm

const microjson = (entity: any): string => {
    if (typeof entity === 'string' || typeof entity === 'number') {
        return JSON.stringify(entity)
    }
    if (Array.isArray(entity)) {
        return `[${entity.map(microjson).join(',')}]`
    }
    const keys = Object.keys(entity)
    keys.sort()
    return `{${keys
        .filter(key => entity[key] !== null && entity[key] !== undefined)
        .map(key => `${microjson(key)}:${microjson(entity[key])}`)
        .join(',')
    }}`
}

const asBufferPlain = post => Buffer.from(microjson(post))

export default post => asBufferPlain(inner(post))
export {
    asBufferPlain 
}
