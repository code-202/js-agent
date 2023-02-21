import express from 'express'

const PORT = 3006

const app = express()

app.get('/404', (req: any, res: any) => {
    res.status(404).send("Not found.")
})

app.get('/500', (req: any, res: any) => {
    res.status(500).send('Something broke!')
})

app.get('/200', (req: any, res: any) => {
    res.send('ok')
})

app.get('/204', (req: any, res: any) => {
    res.status(204).send()
})

app.get('/json', (req: any, res: any) => {
    res.send({ "foo": "bar"})
})

export default app
