import store from './store/'

var needsHelp = process.argv.indexOf('--help') !== -1 ||
                process.argv.indexOf('-h') !== -1 ||
                process.argv.length < 3

async function main() {
  var prOptions = {
    port: parseInt(process.argv[2]),
    bootstrap: process.argv.length === 4 ? [ process.argv[3] ] : []
  }

  const state = {
    isServerNode: true,
    prOptions,
    secretCode: ''
  }
  store.dispatch({type: 'init', state})
  store.dispatch({type: 'terma init'})
}

if (!needsHelp) {
    main()
} else {
  console.error(`\
    ${process.argv[1]} port [bootstrap_urls...]

    Starts a PeerRelay node and listens for WebSocket connectionso on 'port'

    An optional list of bootstrap urls can be provided as positional arguments.
  `)
}

