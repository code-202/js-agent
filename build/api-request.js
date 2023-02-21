"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiRequest = void 0;
const basic_request_1 = require("./basic-request");
class ApiRequest extends basic_request_1.BasicRequest {
    constructor(url, method = 'GET') {
        super(url, method);
        this.addHeader('Content-Type', 'application/json');
        this.addHeader('accept', 'json');
    }
    transformRequestData(data) {
        return JSON.stringify(data);
    }
    transformResponseData(data) {
        return new Promise((resolve, reject) => {
            try {
                if (typeof data === 'string') {
                    resolve(JSON.parse(data));
                }
            }
            catch (e) {
                reject('json_parse_error');
            }
        });
    }
}
exports.ApiRequest = ApiRequest;
