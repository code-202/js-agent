import { Response } from './response';
import { Normalizable, Denormalizable } from '@code-202/serializer';
export type Status = 'waiting' | 'pending' | 'done' | 'error' | 'canceled';
export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type ProgressListener = (progress: number, direction: 'up' | 'down') => void;
export type StatusListener = (status: Status) => void;
export interface RequestInformations {
    readonly status: Status;
    readonly errors: string[];
    readonly progress: number;
    readonly uploadProgress: number;
}
export interface AuthorizationService {
    readonly authorizationToken: string;
    readonly authorizationPrefix: string;
    onAuthorizationError: (responseStatus: any | null, responseTextStatus: any | null) => void;
    onAccessDeniedError: (responseStatus: any | null, responseTextStatus: any | null, data: any | null) => void;
}
export interface Request extends RequestInformations, Normalizable<RequestNormalized>, Denormalizable<RequestNormalized> {
    readonly responseData: any | null;
    readonly responseStatus: any | null;
    readonly responseTextStatus: any | null;
    reset(): this;
    abort(): this;
    send(data?: any): Promise<Response>;
    onProgress(listener: ProgressListener): this;
    onStatusChange(listener: StatusListener): this;
    addHeader(key: string, value: string): this;
    addAuthorization(token: string, prefix: string): this;
    addAuthorizationService(service: AuthorizationService | null): this;
}
export interface RequestNormalized {
    status: Status;
    responseStatus: number | null;
    responseTextStatus: any;
    responseData: any | null;
    progress: number;
    uploadProgress: number;
}
