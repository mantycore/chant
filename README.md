Chant is a part of Anoma family of experimental internet tech. It is a peer to peer realtime web chat / imageboard,
written with preserving the traditions of internet anonymity in mind. The main ideas behind its creation are:

* To escape the need for central server managing communication and related risk of it becoming single point of failure;
* To keep the technology behind it simple and compact enough, for ease of code auditing and reasoning about it;
* To study the organization of distributed systems and related technologies by implementing one.

# Installation

Setup instructions for release 0.0.2 are [here](https://chant.anoma.li/#/4MTHN1j31rnc1qP7iQZZAHWACS6LumRNMnc8HP3e3qbUtJdxV9xFgoUs6t5AYWu4ycNxtY3L1CaW7TYgpSY3MbMf) (in Russian).

In brief, the installation and usage is typical for a node project:

    npm install
    
Open and modify src/index.js to set up a bootstrap list for initial discovery of nodes in the swarm.
For development, it can be ['ws://localhost:7001']

    npx webpack
    node dist/server.js 7001

The server node is invoked with two parameters, port number it listens to, and a bootstrap list.
The bootstrap list is mandatory for any node in the swarm beyond the first one, and consist of websocket urls,
e.g. the second node on the same host may be added as

    node dist/server.js 7002 ws://localhost:7001

For production setup, I strongly recommend using ssl; the server does not support it itself for now, so ssl can
be provided by an https proxy (instructions pending).

For development, browser node can be created by simply opening dist/index.html in a browser. 
A browser node exposes a number of structures to the window object, the most important being pr (PeerRelay instance
for sending messages), peers (a Set of peer nodes), posts (an array of posts) and contentStore (a Map of texts
and attachments, indexed by (mostly) IPFS compatible CIDs.

# Architecture

In the fine tradition of Tlön, we gave the parts of the arhitecture short, lucid, and pronouncedly idiomatic names.

<table>
    <tr>
        <td>interaction</td>
        <td>public thread (Sutra)</td>
        <td>private conversation (Renga)</td>
        <td>Sutra is a public conversation: a collection of suwar, all bearing the id of the starting one. Renga is its private counterpart: a collection of decrypted suwar, all bearing the ids of the starting ones (one for each participant) which provide encryption keys.</td>
    </tr>
    <tr>
        <td>version control</td>
        <td colspan="2">post with its version history (Surah)</td>
        <td>Surah (pl. suwar) is a version-controlled post, containing the original vesrion, all revisions to it, and the resulting current version. It also contains info on whether it was decrypted.</td>
    </tr> 
    <tr>
        <td>content encoding</td>
        <td colspan="2">chant post format (<a href="/schema.md">Psalm</a>)</td>
        <td>Psalm is the basic unit of Chant system, composed of content ids, links to other psalms, and cryptographically signed based on its author's secret code.</td>
    </tr> 
    <tr>
        <td>encryption</td>
        <td>(unencrypted Psalm)</td>
        <td>direct private message,<br />asymmetrically encrypted (Haiku)</td>
        <td>Haiku contains a psalm encrypted with the public keys of one or more other psalms, forming the basis for direct private conversations (renga).</td>
    </tr>
    <tr>
        <td>encryption abstraction</td>
        <td colspan="2">the common supertype of Psalm and Haiku (Poema)</td>
        <td>Poema is just an supertype for ease of transport. Transport only cares for fields common between encrypted and unecrypted posts: id, timestamp, and the protocol version.</td>
    </tr> 
    <tr>
        <td>content routing</td>
        <td colspan="2">chant message protocol (Mantra)</td>
        <td>Mantra is a message from one Chant node to another, bearing one of more psalms, haikus, content files, or request(s) for these.</td>
    </tr>
    <tr>
        <td>basic routing</td>
        <td colspan="2"><a href="https://github.com/xuset/peer-relay">peer-relay</a> (forked and modified)</td>
        <td />
    </tr>   
    <tr>
        <td rowspan="2">transport</td>
        <td rowspan="2">WebSocket</td>
        <td><a href="https://github.com/feross/simple-peer">simple-peer</a></td>
        <td />
    </tr>
    <tr>
        <td>WebRTC</td><td />
    </tr>
</table>

The correspondence between columns breaks at basic routing level, that is to say, there is no correspondence between encrypted/unencrypted distinction and WebSocket/WebRTC.
