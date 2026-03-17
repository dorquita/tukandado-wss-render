import { Router } from 'express'
import apiRoutes from './api.routes.js'

const router = Router()

router.use('/api', apiRoutes)

export default router