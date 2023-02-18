"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = exports.RequestAgent = void 0;
class RequestAgent {
    _promises = [];
    watchPromise(promise) {
        const p = promise.then(() => {
            const index = this._promises.indexOf(p);
            if (index >= 0) {
                this._promises.splice(index, 1);
            }
            return true;
        }).catch(() => {
            const index = this._promises.indexOf(p);
            if (index >= 0) {
                this._promises.splice(index, 1);
            }
            return false;
        });
        this._promises.push(p);
        return this;
    }
    waitForAll() {
        return new Promise((resolve, reject) => {
            const nb = this._promises.length;
            Promise.all(this._promises).then((values) => {
                resolve(values.length);
            }).catch(() => {
                resolve(0);
            });
        });
    }
}
exports.RequestAgent = RequestAgent;
exports.Agent = new RequestAgent();
