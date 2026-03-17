class CommandStore {
  constructor() {
    this.pendingCommands = []
    this.commandsById = new Map()
    this.waitingAgents = []
  }

  addCommand(command) {
    this.pendingCommands.push(command)
    this.commandsById.set(command.id, command)
    this.flushWaitingAgents()
  }

  getCommandById(commandId) {
    return this.commandsById.get(commandId) || null
  }

  getNextPendingCommand() {
    const index = this.pendingCommands.findIndex((command) => command.status === 'pending')

    if (index === -1) {
      return null
    }

    const command = this.pendingCommands[index]
    command.status = 'dispatched'
    command.dispatchedAt = new Date().toISOString()
    this.pendingCommands.splice(index, 1)

    return command
  }

  addWaitingAgent(responder) {
    this.waitingAgents.push(responder)
  }

  removeWaitingAgent(responder) {
    this.waitingAgents = this.waitingAgents.filter((item) => item !== responder)
  }

  flushWaitingAgents() {
    while (this.waitingAgents.length > 0) {
      const nextCommand = this.getNextPendingCommand()

      if (!nextCommand) {
        return
      }

      const responder = this.waitingAgents.shift()
      responder(nextCommand)
    }
  }
}

export const commandStore = new CommandStore()