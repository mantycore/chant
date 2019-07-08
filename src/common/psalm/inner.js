const inner = psalm => {
    const innerPsalm = {...psalm}
    delete innerPsalm.pid
    delete innerPsalm.proofs
    delete innerPsalm.proofKey
    delete innerPsalm.proofSignature
    delete innerPsalm.directKey
    delete innerPsalm.contentMap
    return innerPsalm
}

export default inner
