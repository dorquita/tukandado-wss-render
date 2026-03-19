import { Router } from 'express'
import { ApiController } from '../controllers/api.controller.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()

router.post('/devices/scan', asyncHandler(ApiController.scanDevices))
router.post('/devices/open-close', asyncHandler(ApiController.openCloseDevice))
router.post('/devices/scan-locks', asyncHandler(ApiController.scanLocks))

export default router