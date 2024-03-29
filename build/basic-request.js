"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicRequest = void 0;
const agent_1 = require("./agent");
const superagent = __importStar(require("superagent"));
class BasicRequest {
    _request = null;
    _settings;
    _urlParams = {};
    _responseStatus = null;
    _responseTextStatus = '';
    _responseData = null;
    _status = 'waiting';
    _progress = 0;
    _uploadProgress = 0;
    _progressListeners = [];
    _statusListeners = [];
    _authorizationService = null;
    constructor(url, method = 'GET') {
        this._settings = {
            url: url,
            method: method,
            data: {},
            headers: {}
        };
    }
    get status() {
        return this._status;
    }
    get errors() {
        if (this._status !== 'error') {
            return [];
        }
        let message = this._responseTextStatus;
        if (message instanceof Error) {
            message = message.message;
        }
        if (this._responseData && this._responseData instanceof Object && this._responseData.message) {
            message = this._responseData.message;
        }
        return [message];
    }
    get responseStatus() {
        return this._responseStatus;
    }
    get responseTextStatus() {
        return this._responseTextStatus;
    }
    get responseData() {
        return this._responseData;
    }
    get progress() {
        return this._progress;
    }
    get uploadProgress() {
        return this._uploadProgress;
    }
    addHeader(key, value) {
        this._settings.headers[key] = value;
        return this;
    }
    addAuthorization(token, prefix = 'Bearer') {
        this._settings.headers['Authorization'] = prefix + ' ' + token;
        return this;
    }
    addAuthorizationService(service) {
        this._authorizationService = service;
        return this;
    }
    setUrlParam(key, value) {
        this._urlParams[key] = value;
        return this;
    }
    onProgress(listener) {
        this._progressListeners.push(listener);
        return this;
    }
    onStatusChange(listener) {
        this._statusListeners.push(listener);
        return this;
    }
    reset() {
        if (this._status !== 'pending') {
            this.changeStatus('waiting');
        }
        return this;
    }
    abort() {
        if (this._request) {
            this._request.abort();
        }
        return this;
    }
    send(data) {
        this._settings.data = data;
        this.abort();
        this.changeProgression(0);
        this.changeUploadProgression(0);
        this.changeStatus('pending');
        const p = new Promise((resolve, reject) => {
            let url = this._settings.url;
            for (const key in this._urlParams) {
                url = url.replace('{' + key + '}', this._urlParams[key]);
            }
            this._request = superagent.default(this._settings.method || 'GET', url);
            if (!this._request) {
                reject();
                return;
            }
            this._request.on('abort', () => {
                if (!this._request) {
                    return;
                }
                this.changeProgression(100);
                this.changeUploadProgression(100);
                this._request = null;
                this._responseTextStatus = 'aborted';
                this.changeStatus('canceled');
                reject(this.buildResponse());
            });
            this._request.on('progress', (event) => {
                if (event.direction === 'download' && event.total) {
                    this.changeProgression(Math.ceil(100 * event.loaded / event.total));
                }
                if (event.direction === 'upload' && event.total) {
                    this.changeUploadProgression(Math.ceil(100 * event.loaded / event.total));
                }
            });
            if (this._authorizationService) {
                this.addAuthorization(this._authorizationService.authorizationToken, this._authorizationService.authorizationPrefix);
            }
            if (this._settings.headers) {
                this._request.set(this._settings.headers);
            }
            this._request.send(this.transformRequestData(this._settings.data));
            this._request.retry(2);
            this._request
                .then((response) => {
                this._responseStatus = response.status;
                this._responseTextStatus = response.text;
                this._responseData = response.body;
                this.changeProgression(100);
                this.changeUploadProgression(100);
                this._request = null;
                if (response.status >= 300) {
                    if (this._responseStatus === 401 && this._authorizationService) {
                        this._authorizationService.onAuthorizationError(this._responseStatus, this._responseTextStatus);
                    }
                    if (this._responseStatus === 403 && this._authorizationService) {
                        this._authorizationService.onAccessDeniedError(this._responseStatus, this._responseTextStatus, this._responseData);
                    }
                    this.changeStatus('error');
                    reject(this.buildResponse());
                    return;
                }
                this.transformResponseData(response.body)
                    .then((data) => {
                    this._responseData = data;
                    this.changeStatus('done');
                    resolve(this.buildResponse());
                })
                    .catch((err) => {
                    this._responseStatus = 500;
                    this._responseTextStatus = err;
                    this.changeStatus('error');
                    reject(this.buildResponse());
                });
            })
                .catch((err) => {
                this._responseStatus = err.status;
                this._responseTextStatus = err.message;
                this._responseData = null;
                if (typeof err.response !== 'undefined') {
                    this._responseData = err.response.body;
                }
                this._request = null;
                if (this._responseStatus === 401 && this._authorizationService) {
                    this._authorizationService.onAuthorizationError(this._responseStatus, this._responseTextStatus);
                }
                if (this._responseStatus === 403 && this._authorizationService) {
                    this._authorizationService.onAccessDeniedError(this._responseStatus, this._responseTextStatus, this._responseData);
                }
                this.changeStatus('error');
                reject(this.buildResponse());
            });
        });
        agent_1.Agent.watchPromise(p);
        return p;
    }
    transformRequestData(data) {
        return data !== undefined ? data : null;
    }
    transformResponseData(data) {
        return new Promise((resolve) => resolve(data));
    }
    buildResponse() {
        return {
            status: this._responseStatus ? this._responseStatus : 500,
            textStatus: this._responseTextStatus,
            data: this._responseData
        };
    }
    changeProgression(progress) {
        if (progress === this._progress) {
            return;
        }
        this._progress = progress;
        for (const listener of this._progressListeners) {
            listener(progress, 'down');
        }
    }
    changeUploadProgression(progress) {
        if (progress === this._uploadProgress) {
            return;
        }
        this._uploadProgress = progress;
        for (const listener of this._progressListeners) {
            listener(progress, 'up');
        }
    }
    changeStatus(status) {
        if (status === this._status) {
            return;
        }
        this._status = status;
        for (const listener of this._statusListeners) {
            listener(status);
        }
    }
    normalize() {
        return {
            status: this._status,
            responseStatus: this._responseStatus,
            responseTextStatus: this._responseTextStatus,
            responseData: this._responseData,
            progress: this._progress,
            uploadProgress: this._uploadProgress,
        };
    }
    denormalize(data) {
        try {
            this._status = data.status;
            this._responseStatus = data.responseStatus;
            this._responseTextStatus = data.responseTextStatus;
            this._responseData = data.responseData;
            this._progress = data.progress;
            this._uploadProgress = data.uploadProgress;
        }
        catch (e) {
            console.error('Impossible to deserialize : bad data');
        }
    }
}
exports.BasicRequest = BasicRequest;
