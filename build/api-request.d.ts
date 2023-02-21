import { Method } from './request';
import { BasicRequest } from './basic-request';
export declare class ApiRequest extends BasicRequest {
    constructor(url: string, method?: Method);
    transformRequestData(data?: any): any;
    protected transformResponseData(data: any): Promise<any>;
}
