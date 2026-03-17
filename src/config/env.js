import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  commandTimeoutMs: Number(process.env.COMMAND_TIMEOUT_MS || 20000)
}