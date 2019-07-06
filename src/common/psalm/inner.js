const inner = post => {
    const innerPost = {...post}
    delete innerPost.pid
    delete innerPost.proofs
    delete innerPost.proofKey
    delete innerPost.proofSignature
    delete innerPost.directKey
    delete innerPost.contentMap
    return innerPost
}

export default inner
