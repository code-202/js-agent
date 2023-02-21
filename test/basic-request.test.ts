import { test, expect, afterAll, beforeAll } from '@jest/globals'
import { BasicRequest, Response } from '../src'

import app from './server'

let server: any
beforeAll(() => {
    server = app.listen(3006)
})
afterAll(() => {
    server.close()
})

test('404', () => {
    expect.assertions(2);

    const req = new BasicRequest(':3006/404')

    const p = req.send().catch((err: any) => {
        expect(err.status).toBe(404)
        expect(req.status).toBe('error')
    })

    return p
})

test('500', () => {
    expect.assertions(2);

    const req = new BasicRequest(':3006/500')

    const p = req.send().catch((err: any) => {
        expect(err.status).toBe(500)
        expect(req.status).toBe('error')
    })

    return p
})

test('abort', () => {
    expect.assertions(2);

    const req = new BasicRequest(':3006/404')

    const p = req.send().catch((err: any) => {
        expect(err.status).toBe(500)
        expect(req.status).toBe('canceled')
    })

    req.abort()

    return p
})

test('200', () => {
    expect.assertions(2);

    const req = new BasicRequest(':3006/200')

    const p = req.send().then((res: Response.Response) => {
        expect(res.status).toBe(200)
        expect(req.status).toBe('done')
    })

    return p
})

test('204', () => {
    expect.assertions(2);

    const req = new BasicRequest(':3006/204')

    const p = req.send().then((res: Response.Response) => {
        expect(res.status).toBe(204)
        expect(req.status).toBe('done')
    })

    return p
})
