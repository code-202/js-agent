import { Request, Method, Status, ProgressListener, StatusListener, AuthorizationService } from './request';
import { Response } from './response';
export interface Settings {
    url: string;
    method: Method;
    data: any;
    headers: {
        [key: string]: string;
    };
}
export declare class BasicRequest implements Request {
    private _request;
    protected _settings: Settings;
    protected _urlParams: {
        [key: string]: string;
    };
    protected _responseStatus: number | null;
    protected _responseTextStatus: any;
    protected _responseData: any | null;
    protected _status: Status;
    protected _progress: number;
    protected _uploadProgress: number;
    protected _progressListeners: ProgressListener[];
    protected _statusListeners: StatusListener[];
    protected _authorizationService: AuthorizationService | null;
    constructor(url: string, method?: Method);
    get status(): Status;
    get errors(): any[];
    get responseStatus(): number | null;
    get responseTextStatus(): any;
    get responseData(): any;
    get progress(): number;
    get uploadProgress(): number;
    addHeader(key: string, value: string): this;
    addAuthorization(token: string, prefix?: string): this;
    addAuthorizationService(service: AuthorizationService | null): this;
    setUrlParam(key: string, value: string): this;
    onProgress(listener: ProgressListener): this;
    onStatusChange(listener: StatusListener): this;
    reset(): this;
    abort(): this;
    send(data?: any): Promise<Response>;
    protected transformRequestData(data?: any): any;
    protected transformResponseData(data: any): boolean;
    protected transformErrorResponseData(data: string): boolean;
    protected buildResponse(): Response;
    protected changeProgression(progress: number): void;
    protected changeUploadProgression(progress: number): void;
    protected changeStatus(status: Status): void;
}
