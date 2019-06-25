Chant is a part of Anoma family of experimental internet tech. It is a peer to peer realtime web chat / imageboard,
written with preserving the traditions of internet anonymity in mind. The main ideas behind its creation are:

* To escape the need for central server managing communication and related risk of it becoming single point of failure;
* To keep the technology behind it simple and compact enough, for ease of code auditing and reasoning about it;
* To study the organization of distributed systems and related technologies by implementing one.

# Installation

The installation and usage is typical for a node project:

    npm install
    
Open and modify src/index.js to set up a bootstrap list for initial discovery of nodes in the swarm.
For development, it can be ['ws://localhost:7001']

    npx webpack
    node dist/server.js 7001

The server node is invoked with two parameters, port number it listens to, and a bootstrap list.
The bootstrap list is mandatory for any node in the swarm beyond the first one, and consist of websocket urls,
e.g. the second node on the same host may be added as

    node 7002 ws://localhost:7001

For production setup, I strongly recommend using ssl; the server does not support it itself for now, so ssl can
be provided by an https proxy (instructions pending).

Browser node exposes a number of structures to the window object, the most important being pr (PeerRelay instance
for sending messages), peers (a Set of peer nodes), posts (an array of posts) and contentStore (a Map of texts
and attachments, indexed by (mostly) IPFS compatible CIDs.
