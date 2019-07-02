import thousandFile from './google-10000-english.txt'
const thousand = thousandFile.split('\n')
const pass = () => Array(4).fill(() => Math.floor(Math.random() * 10000)).map(rand => thousand[rand()]).join('-')
//const masterPassword = pass()
/*
const encoder = new TextEncoder("utf-8")
const encode = encoder.encode.bind(encoder)
const decoder = new TextDecoder("utf-8")
const decode = decoder.decode.bind(decoder)*/
export { pass }
