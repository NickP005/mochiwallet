type MessageResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
}

export class SessionManager {
  private port: chrome.runtime.Port
  private messageHandlers: Map<string, (response: MessageResponse) => void> = new Map()

  constructor() {
    this.port = chrome.runtime.connect({ name: 'session-manager' })
    
    this.port.onMessage.addListener((message: MessageResponse & { messageId?: string }) => {
      if (message.messageId) {
        const handler = this.messageHandlers.get(message.messageId)
        if (handler) {
          handler(message)
          this.messageHandlers.delete(message.messageId)
        }
      }
    })
  }

  private async sendMessage(type: string, payload?: any): Promise<MessageResponse> {
    return new Promise((resolve) => {
      const messageId = crypto.randomUUID()
      
      this.messageHandlers.set(messageId, resolve)
      
      this.port.postMessage({
        type,
        payload,
        messageId
      })
    })
  }

  async startSession(encryptedPassword: string, duration?: number): Promise<void> {
    console.log('SessionManager: Starting session', encryptedPassword, duration)
    const response = await this.sendMessage('startSession', { encryptedPassword, duration })
    if (!response.success) {
      throw new Error(response.error || 'Failed to start session')
    }
  }

  async extendSession(duration?: number): Promise<void> {
    const response = await this.sendMessage('extendSession', { duration })
    if (!response.success) {
      throw new Error(response.error || 'Failed to extend session')
    }
  }

  async checkSession(): Promise<{ active: boolean, encryptedPassword?: string }> {
    const response = await this.sendMessage('checkSession')
    if (!response.success) {
      throw new Error(response.error || 'Failed to check session')
    }
    return response.data
  }

  async endSession(): Promise<void> {
    const response = await this.sendMessage('endSession')
    if (!response.success) {
      throw new Error(response.error || 'Failed to end session')
    }
  }

  async recordActivity(): Promise<void> {
    try {
      await this.sendMessage('recordActivity')
    } catch (error) {
      console.warn('Failed to record activity:', error)
    }
  }
}

// Create singleton instance
export const sessionManager = new SessionManager() 