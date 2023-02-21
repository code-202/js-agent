import { Method } from './request'
import { BasicRequest } from './basic-request'

export class ApiRequest extends BasicRequest {

    constructor (url: string, method: Method = 'GET') {
        super(url, method)
        this.addHeader('Content-Type', 'application/json')
        this.addHeader('accept', 'json')
    }
}
