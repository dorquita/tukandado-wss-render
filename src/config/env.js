import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  agentToken: process.env.AGENT_TOKEN || 'super-secret-token',
  commandTimeoutMs: Number(process.env.COMMAND_TIMEOUT_MS || 20000)
}