import { test, expect, afterAll, beforeAll } from '@jest/globals'
import { ApiRequest, Response } from '../src'

import app from './server'

let server: any
beforeAll(() => {
    server = app.listen(3007)
})
afterAll(() => {
    server.close()
})

test('json', () => {
    expect.assertions(3);

    const req = new ApiRequest(':3007/json')

    const p = req.send().then((res: Response.Response) => {
        expect(res.status).toBe(200)
        expect(req.status).toBe('done')
        expect(res.data.foo).toBe('bar')
    })

    return p
})
