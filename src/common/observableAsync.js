import { Observable } from 'rxjs'

function observableAsync(asyncFun) {
    return action => new Observable(subscriber => asyncFun(action, subscriber))
}

export default observableAsync
