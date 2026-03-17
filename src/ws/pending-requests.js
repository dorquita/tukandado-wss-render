class PendingRequests {
  constructor() {
    this.items = new Map()
  }

  set(requestId, value) {
    this.items.set(requestId, value)
  }

  get(requestId) {
    return this.items.get(requestId) || null
  }

  delete(requestId) {
    this.items.delete(requestId)
  }
}

export const pendingRequests = new PendingRequests()