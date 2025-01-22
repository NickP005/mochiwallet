interface SessionConfig {
  allowedOrigins: string[]
  allowedExtensionIds: string[]
  disconnectGracePeriod?: number // minutes before locking after disconnect
}

interface SessionWorkerMessage {
  type: string
  payload?: any
  messageId: string
}

class SessionWorkerManager {
  private sessionData: {
    encryptedPassword?: string
    disconnectedAt?: number
  } = {}
  
  private connections: Map<string, chrome.runtime.Port> = new Map()
  private allowedOrigins: Set<string>
  private allowedExtensionIds: Set<string>

  private disconnectGracePeriod: number
  private lockTimeout?: NodeJS.Timeout

  constructor(config: SessionConfig) {
    this.allowedOrigins = new Set(config.allowedOrigins || [])
    this.allowedExtensionIds = new Set(config.allowedExtensionIds || [])
    this.disconnectGracePeriod = (config.disconnectGracePeriod || 5) * 60 * 1000
    
    chrome.runtime.onConnect.addListener(this.handleConnection.bind(this))
  }

  private verifyOrigin(port: chrome.runtime.Port): boolean {
    if (port.sender?.id) {
      return this.allowedExtensionIds.has(port.sender.id)
    }
    if (port.sender?.origin) {
      return this.allowedOrigins.has(port.sender.origin)
    }
    return false
  }

  private handleConnection(port: chrome.runtime.Port) {
    if (port.name !== 'session-manager') return

    if (!this.verifyOrigin(port)) {
      console.warn('Unauthorized connection attempt:', port.sender?.origin || port.sender?.id)
      port.disconnect()
      return
    }
    console.log('Session worker: Handling connection')

    const id = crypto.randomUUID()
    this.connections.set(id, port)

    // Clear any pending lock timeouts since we have an active connection
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout)
      this.lockTimeout = undefined
      this.sessionData.disconnectedAt = undefined
    }

    port.onMessage.addListener((message: SessionWorkerMessage) => 
      this.handleMessage(message, port)
    )

    port.onDisconnect.addListener(() => {
      this.connections.delete(id)
      this.handleDisconnect()
    })
  }

  private handleDisconnect() {
    // If this was the last connection, start the grace period
    if (this.connections.size === 0 && this.sessionData.encryptedPassword) {
      this.sessionData.disconnectedAt = Date.now()
      
      // Set timeout to end session after grace period
      this.lockTimeout = setTimeout(() => {
        this.handleEndSession()
        // Notify any new connections that might have connected
        this.connections.forEach(port => {
          port.postMessage({
            type: 'sessionExpired',
            data: { timestamp: Date.now() }
          })
        })
      }, this.disconnectGracePeriod)
    }
  }

  private async handleMessage(message: SessionWorkerMessage, port: chrome.runtime.Port) {
    if(port.name !== 'session-manager') return
    try {
      let response: any

      switch (message.type) {
        case 'startSession':
          response = await this.handleStartSession(message.payload)
          break

        case 'checkSession':
          response = await this.handleCheckSession()
          break

        case 'endSession':
          response = await this.handleEndSession()
          break

        default:
          throw new Error('Unknown message type')
      }

      port.postMessage({
        success: true,
        data: response,
        messageId: message.messageId
      })
    } catch (error) {
      port.postMessage({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        messageId: message.messageId
      })
    }
  }

  private handleStartSession(payload: { encryptedPassword: string }): void {
    console.log('Starting session', payload.encryptedPassword)
    this.sessionData = {
      encryptedPassword: payload.encryptedPassword,
      disconnectedAt: undefined
    }
  }

  private handleCheckSession(): { active: boolean, encryptedPassword?: string } {
    if (!this.sessionData.encryptedPassword) {
      return { active: false }
    }

    // If disconnected, check if we're still within grace period
    if (this.sessionData.disconnectedAt) {
      const timeSinceDisconnect = Date.now() - this.sessionData.disconnectedAt
      if (timeSinceDisconnect > this.disconnectGracePeriod) {
        this.handleEndSession()
        return { active: false }
      }
    }

    return {
      active: true,
      encryptedPassword: this.sessionData.encryptedPassword
    }
  }

  private handleEndSession(): void {
    console.log('Ending session')
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout)
      this.lockTimeout = undefined
    }
    this.sessionData = {}
  }
}
// Initialize the session worker
const sessionWorker = new SessionWorkerManager({
  disconnectGracePeriod: 15, // 15 minutes grace period after disconnect
  allowedOrigins: [
    'chrome-extension://your-extension-id',
    'moz-extension://your-firefox-id'
  ],
  allowedExtensionIds: [
    "hdbpfdmjfcnbndgcifjfjiggjbhimgno"
  ]
}) 