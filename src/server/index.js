import process from 'process'
import Client from 'peer-relay'
//var toCID = require('./src/cid.js')
import messageHandler from 'Common/messageHandler.js'
import {setup, stateChangeHandler} from './database.js'

var needsHelp = process.argv.indexOf('--help') !== -1 ||
                process.argv.indexOf('-h') !== -1 ||
                process.argv.length < 3

async function main() {
  var opts = {
    port: parseInt(process.argv[2]),
    bootstrap: process.argv.length === 4 ? [ process.argv[3] ] : []
  }

  const state = {
    pr: new Client(opts),
    isServerNode: true,
  }
  await setup(state)

  messageHandler(state)
  state.onStateChange(stateChangeHandler)

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

