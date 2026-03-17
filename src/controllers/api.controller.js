import { commandService } from '../services/command.service.js'
import { AppError } from '../utils/app-error.js'

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
}