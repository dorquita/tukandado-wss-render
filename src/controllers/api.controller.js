import { commandService } from '../services/command.service.js'
import { AppError } from '../utils/app-error.js'
import { sendCommandToAgent } from '../ws/agent-command.service.js'

export class ApiController {
  static async scanDevices(req, res) {
    const result = await commandService.scanDevices()

    res.status(200).json({
      success: true,
      data: result
    })
  }

  static async openCloseDevice(req, res) {
    const { action, deviceId } = req.body ?? {}

    if (!action || !['open', 'close'].includes(action)) {
      throw new AppError('action must be "open" or "close"', 400)
    }

    if (!deviceId || typeof deviceId !== 'string') {
      throw new AppError('deviceId is required', 400)
    }

    const result = await commandService.openCloseDevice({ action, deviceId })

    res.status(200).json({
      success: true,
      data: result
    })
  }

  static async scanLocks(req, res, next) {
    try {
      const { deviceId, clubId } = req.body
  
      if (!deviceId) {
        return res.status(400).json({
          success: false,
          message: 'deviceId es requerido'
        })
      }
  
      const result = await sendCommandToAgent('scan_locks', {
        deviceId,
        clubId
      })
  
      return res.status(200).json({
        success: true,
        message: 'Escaneo completado correctamente',
        data: result
      })
    } catch (error) {
      next(error)
    }
  }
}