"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiRequest = void 0;
const basic_request_1 = require("./basic-request");
class ApiRequest extends basic_request_1.BasicRequest {
    constructor(url, method = 'GET') {
        super(url, method);
        if (method != 'GET') {
            this.addHeader('Content-Type', 'application/json');
        }
        this.addHeader('accept', 'application/json');
    }
}
exports.ApiRequest = ApiRequest;
