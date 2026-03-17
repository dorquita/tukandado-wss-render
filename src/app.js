import express from 'express'
import pino from 'pino'
import pinoHttp from 'pino-http'
import routes from './routes/index.js'
import { notFoundMiddleware } from './middlewares/not-found.middleware.js'
import { errorMiddleware } from './middlewares/error.middleware.js'

const logger = pino()

export function createApp() {
  const app = express()

  app.use(express.json({ limit: '1mb' }))
  app.use(pinoHttp({ logger }))

  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'OK'
    })
  })

  app.use(routes)

  app.use(notFoundMiddleware)
  app.use(errorMiddleware)

  return app
}