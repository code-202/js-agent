import { Method } from './request';
import { BasicRequest } from './basic-request';
export declare class ApiRequest extends BasicRequest {
    constructor(url: string, method?: Method);
}
