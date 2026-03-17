const { DeviceProvider } = require('./device.provider')
const { AppError } = require('../utils/app-error')

class MockDeviceProvider extends DeviceProvider {
  constructor() {
    super()

    this.devices = [
      {
        id: 'locker-001',
        name: 'Locker Entrance A',
        macAddress: 'AA:BB:CC:DD:EE:01',
        rssi: -52,
        provider: 'mock',
        isReachable: true
      },
      {
        id: 'locker-002',
        name: 'Locker Entrance B',
        macAddress: 'AA:BB:CC:DD:EE:02',
        rssi: -60,
        provider: 'mock',
        isReachable: true
      }
    ]
  }

  async scan(timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(timeoutMs || 500, 1000)))
    return this.devices
  }

  async open(deviceId) {
    const device = this.devices.find((d) => d.id === deviceId)

    if (!device) {
      throw new AppError(`Device ${deviceId} not found`, 404)
    }

    return {
      deviceId,
      opened: true,
      message: `Device ${deviceId} opened successfully`,
      provider: 'mock',
      openedAt: new Date().toISOString()
    }
  }
}

module.exports = { MockDeviceProvider }