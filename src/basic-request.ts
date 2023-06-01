import { Request, Method, Status, ProgressListener, StatusListener, AuthorizationService, RequestNormalized } from './request'
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

        const p = new Promise<Response>((resolve, reject) => {
            let url = this._settings.url

            for (const key in this._urlParams) {
                url = url.replace('{' + key + '}', this._urlParams[key])
            }

            this._request = superagent.default(this._settings.method || 'GET', url)

            if (!this._request) {
                reject()
                return
            }

            this._request.on('abort', () => {
                if (!this._request) {
                    return
                }

                this.changeProgression(100)
                this.changeUploadProgression(100)

                this._request = null

                this._responseTextStatus = 'aborted'

                this.changeStatus('canceled')
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

            this._request
                .then((response: superagent.Response) => {
                    this._responseStatus = response.status
                    this._responseTextStatus = response.text
                    this._responseData = response.body

                    this.changeProgression(100)
                    this.changeUploadProgression(100)

                    this._request = null

                    if (response.status >= 300) {
                        if (this._responseStatus === 401 && this._authorizationService) {
                            this._authorizationService.onAuthorizationError(this._responseStatus, this._responseTextStatus)
                        }
                        if (this._responseStatus === 403 && this._authorizationService) {
                            this._authorizationService.onAccessDeniedError(this._responseStatus, this._responseTextStatus, this._responseData)
                        }

                        this.changeStatus('error')
                        reject(this.buildResponse())

                        return
                    }

                    this.transformResponseData(response.body)
                        .then((data: any) => {
                            this._responseData = data

                            this.changeStatus('done')
                            resolve(this.buildResponse())
                        })
                        .catch((err: string) => {
                            this._responseStatus = 500
                            this._responseTextStatus = err
                            this.changeStatus('error')
                            reject(this.buildResponse())
                        })
                })
                .catch((err: any) => {

                    this._responseStatus = err.status
                    this._responseTextStatus = err.message
                    this._responseData = null

                    if (typeof err.response !== 'undefined') {
                        this._responseData = err.response.body
                    }

                    this._request = null
                    if (this._responseStatus === 401 && this._authorizationService) {
                        this._authorizationService.onAuthorizationError(this._responseStatus, this._responseTextStatus)
                    }
                    if (this._responseStatus === 403 && this._authorizationService) {
                        this._authorizationService.onAccessDeniedError(this._responseStatus, this._responseTextStatus, this._responseData)
                    }
                    this.changeStatus('error')
                    reject(this.buildResponse())
                })
        })

        Agent.watchPromise(p)

        return p
    }

    protected transformRequestData (data?: any): any {
        return data !== undefined ? data : null
    }

    protected transformResponseData (data: any): Promise<any> {
        return new Promise<any>((resolve) => resolve(data))
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

    public normalize(): RequestNormalized {
        return {
            status: this._status,
            responseStatus: this._responseStatus,
            responseTextStatus: this._responseTextStatus,
            responseData: this._responseData,
            progress: this._progress,
            uploadProgress: this._uploadProgress,
        }
    }

    public denormalize(data: RequestNormalized): any {
        try {
            this._status = data.status
            this._responseStatus = data.responseStatus
            this._responseTextStatus = data.responseTextStatus
            this._responseData = data.responseData
            this._progress = data.progress
            this._uploadProgress = data.uploadProgress

        } catch (e) {
            console.error('Impossible to deserialize : bad data')
        }
    }
}
