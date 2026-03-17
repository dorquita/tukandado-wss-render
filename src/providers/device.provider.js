class DeviceProvider {
  async scan(_timeoutMs) {
    throw new Error('scan() must be implemented')
  }

  async open(_deviceId) {
    throw new Error('open() must be implemented')
  }
}

module.exports = { DeviceProvider }