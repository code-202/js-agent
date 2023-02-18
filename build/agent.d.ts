export declare class RequestAgent {
    protected _promises: Promise<boolean>[];
    watchPromise(promise: Promise<any>): this;
    waitForAll(): Promise<number>;
}
export declare const Agent: RequestAgent;
