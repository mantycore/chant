const microjson = entity => {
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

export default microjson
