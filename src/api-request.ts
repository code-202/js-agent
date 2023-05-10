import { Method } from './request'
import { BasicRequest } from './basic-request'

export class ApiRequest extends BasicRequest {

    constructor (url: string, method: Method = 'GET') {
        super(url, method)
        if (method != 'GET') {
            this.addHeader('Content-Type', 'application/json')
        }
        this.addHeader('accept', 'application/json')
    }
}
