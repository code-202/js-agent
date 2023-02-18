import { Request, Method, Status, ProgressListener, StatusListener, AuthorizationService } from './request'
import { Response } from './response'
import { Agent } from './agent'
import * as superagent from 'superagent'

export interface Settings {
    url: string
    method: Method
    data: any
    headers: {[key: string]: string}
}

export class BasicRequest implements Request {
    private _request: superagent.SuperAgentRequest | null = null
    protected _settings: Settings

    protected _urlParams: {[key: string]: string} = {}

    protected _responseStatus: number | null = null
    protected _responseTextStatus: any = ''
    protected _responseData: any | null = null

    protected _status: Status = 'waiting'
    protected _progress: number = 0
    protected _uploadProgress: number = 0

    protected _progressListeners: ProgressListener[] = []
    protected _statusListeners: StatusListener[] = []

    protected _authorizationService: AuthorizationService | null = null

    constructor (url: string, method: Method = 'GET') {

        this._settings = {
            url: url,
            method: method,
            data: {},
            headers: {}
        }
    }

    get status (): Status {
        return this._status
    }

    get errors () {
        if (this._status !== 'error') {
            return []
        }

        let message = this._responseTextStatus
        if (message instanceof Error) {
            message = message.message
        }
        if (this._responseData && this._responseData instanceof Object && this._responseData.message) {
            message = this._responseData.message
        }

        return [message]
    }

    get responseStatus () {
        return this._responseStatus
    }

    get responseTextStatus () {
        return this._responseTextStatus
    }

    get responseData () {
        return this._responseData
    }

    get progress () {
        return this._progress
    }

    get uploadProgress () {
        return this._uploadProgress
    }

    addHeader (key: string, value: string): this {
        this._settings.headers[key] = value

        return this
    }

    addAuthorization (token: string, prefix: string = 'Bearer'): this {
        this._settings.headers['Authorization'] = prefix + ' ' + token

        return this
    }

    addAuthorizationService (service: AuthorizationService | null): this {
        this._authorizationService = service
        return this
    }

    setUrlParam (key: string, value: string): this {
        this._urlParams[key] = value

        return this
    }

    onProgress (listener: ProgressListener): this {
        this._progressListeners.push(listener)

        return this
    }

    onStatusChange (listener: StatusListener): this {
        this._statusListeners.push(listener)

        return this
    }

    reset () {
        if (this._status !== 'pending') {
            this.changeStatus('waiting')
        }

        return this
    }

    abort () {
        if (this._request) {
            this._request.abort()
        }

        return this
    }

    send (data?: any): Promise<Response> {
        this._settings.data = data

        this.abort()

        this.changeProgression(0)
        this.changeUploadProgression(0)
        this.changeStatus('pending')

        return new Promise((resolve, reject) => {
            let url = this._settings.url

            for (const key in this._urlParams) {
                url = url.replace('{' + key + '}', this._urlParams[key])
            }

            this._request = superagent.default(this._settings.method || 'GET', url)

            if (!this._request) {
                reject()
                return
            }

            this._request.on('response', (response: superagent.Response) => {
                this._responseStatus = response.status
                this._responseTextStatus = response.text
                this._responseData = response.body

                this.changeProgression(100)
                this.changeUploadProgression(100)

                if (response.status === 204) {
                    this._responseData = null
                    this.changeStatus('done')
                } else if ((response.status === 200 || response.status === 201) && this.transformResponseData(this._responseData)) {
                    this.changeStatus('done')
                } else {
                    if (response.status !== 200 && response.status !== 201) {
                        this.transformErrorResponseData(this._responseData)
                    }
                    this.changeStatus('error')
                }

                this._request = null

                if (this._status === 'done') {
                    resolve(this.buildResponse())
                } else {
                    if (this._responseStatus === 401 && this._authorizationService) {
                        this._authorizationService.onAuthorizationError(this._responseStatus, this._responseTextStatus)
                    }

                    reject(this.buildResponse())
                }
            })

            this._request.on('abort', () => {
                if (!this._request) {
                    return
                }

                this.changeProgression(100)
                this.changeUploadProgression(100)
                this.changeStatus('canceled')

                this._request = null

                reject(this.buildResponse())
            })

            this._request.on('progress', (event: superagent.ProgressEvent) => {
                if (event.direction === 'download' && event.total) {
                    this.changeProgression(Math.ceil(100 * event.loaded / event.total))
                }
                if (event.direction === 'upload' && event.total) {
                    this.changeUploadProgression(Math.ceil(100 * event.loaded / event.total))
                }
            })

            if (this._authorizationService) {
                this.addAuthorization(this._authorizationService.authorizationToken, this._authorizationService.authorizationPrefix)
            }

            if (this._settings.headers) {
                this._request.set(this._settings.headers)
            }

            this._request.send(this.transformRequestData(this._settings.data))

            this._request.retry(2)

            Agent.watchPromise(new Promise<void>((resolve, reject) => {
                if (!this._request) {
                    reject()
                    return
                }

                this._request.end((err: any, res: superagent.Response) => {
                    if (err) {
                        reject()
                    } else {
                        resolve()
                    }
                })
            }))
        })
    }

    protected transformRequestData (data?: any): any {
        return data !== undefined ? data : null
    }

    protected transformResponseData (data: any): boolean {
        return true
    }

    protected transformErrorResponseData (data: string): boolean {
        return this.transformResponseData(data)
    }

    protected buildResponse (): Response {
        return {
            status: this._responseStatus ? this._responseStatus : 500,
            textStatus: this._responseTextStatus,
            data: this._responseData
        }
    }

    protected changeProgression (progress: number) {
        if (progress === this._progress) {
            return
        }

        this._progress = progress

        for (const listener of this._progressListeners) {
            listener(progress, 'down')
        }
    }

    protected changeUploadProgression (progress: number) {
        if (progress === this._uploadProgress) {
            return
        }

        this._uploadProgress = progress

        for (const listener of this._progressListeners) {
            listener(progress, 'up')
        }
    }

    protected changeStatus (status: Status) {
        if (status === this._status) {
            return
        }

        this._status = status

        for (const listener of this._statusListeners) {
            listener(status)
        }
    }
}
