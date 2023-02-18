import { Method } from './request'
import { BasicRequest } from './basic-request'

export class ApiRequest extends BasicRequest {

    constructor (url: string, method: Method = 'GET') {
        super(url, method)
        this.addHeader('Content-Type', 'application/json')
        this.addHeader('X-Requested-With', 'XMLHttpRequest')
        this.addHeader('accept', 'json')
    }

    transformRequestData (data?: any): any {
        return JSON.stringify(data)
    }

    transformResponseData (data: any): boolean {
        try {
            if (typeof data === 'string') {
                this._responseData = JSON.parse(data)
            }
        } catch (e) {
            this._responseTextStatus = 'json_parse_error'
            return false
        }

        return true
    }
}
