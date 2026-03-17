import { AppError } from './app-error.js'

export function hexToBuffer(hex) {
  if (!hex || typeof hex !== 'string') {
    throw new AppError('Hex command is required', 400)
  }

  const sanitized = hex.replace(/\s+/g, '').toLowerCase()

  if (!/^[0-9a-f]+$/.test(sanitized) || sanitized.length % 2 !== 0) {
    throw new AppError('Invalid hexadecimal command', 400)
  }

  return Buffer.from(sanitized, 'hex')
}