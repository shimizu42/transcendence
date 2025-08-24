export class ChatManager {
  private authManager: any
  private ws: WebSocket | null = null

  constructor(authManager: any, ws: WebSocket | null) {
    this.authManager = authManager
    this.ws = ws
  }

  public async getConversations(): Promise<any[]> {
    try {
      const response = await fetch('/api/messages/conversations', {
        headers: {
          'Authorization': `Bearer ${this.authManager.getToken()}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to get conversations:', error)
      return []
    }
  }

  public async getMessages(userId?: string): Promise<any[]> {
    try {
      const url = userId ? `/api/messages?userId=${userId}` : '/api/messages'
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.authManager.getToken()}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to get messages:', error)
      return []
    }
  }

  public async sendMessage(receiverId: string, content: string, type: string = 'text', data?: any): Promise<boolean> {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authManager.getToken()}`
        },
        body: JSON.stringify({
          receiverId,
          content,
          type,
          data
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return true
    } catch (error) {
      console.error('Failed to send message:', error)
      return false
    }
  }

  public async sendGameInvitation(receiverId: string, gameType: 'pong' | 'tank'): Promise<boolean> {
    try {
      const response = await fetch('/api/invitations/game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authManager.getToken()}`
        },
        body: JSON.stringify({
          receiverId,
          gameType
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return true
    } catch (error) {
      console.error('Failed to send game invitation:', error)
      return false
    }
  }

  public async acceptGameInvitation(invitationId: string): Promise<string | null> {
    try {
      const response = await fetch(`/api/invitations/game/${invitationId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authManager.getToken()}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      return result.gameId
    } catch (error) {
      console.error('Failed to accept game invitation:', error)
      return null
    }
  }

  public async declineGameInvitation(invitationId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/invitations/game/${invitationId}/decline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authManager.getToken()}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return true
    } catch (error) {
      console.error('Failed to decline game invitation:', error)
      return false
    }
  }

  public async blockUser(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/users/me/block/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authManager.getToken()}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return true
    } catch (error) {
      console.error('Failed to block user:', error)
      return false
    }
  }

  public async unblockUser(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/users/me/block/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authManager.getToken()}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return true
    } catch (error) {
      console.error('Failed to unblock user:', error)
      return false
    }
  }

  public async getBlockedUsers(): Promise<any[]> {
    try {
      const response = await fetch('/api/users/me/blocked', {
        headers: {
          'Authorization': `Bearer ${this.authManager.getToken()}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to get blocked users:', error)
      return []
    }
  }

  public async markMessageAsRead(messageId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/messages/${messageId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.authManager.getToken()}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return true
    } catch (error) {
      console.error('Failed to mark message as read:', error)
      return false
    }
  }

  public renderChatInterface(): string {
    return `
      <div id="chat-container" class="fixed bottom-4 right-4 w-80 h-96 bg-game-text border border-neon-blue rounded-lg shadow-lg z-50">
        <div class="flex flex-col h-full">
          <!-- Chat Header -->
          <div class="flex justify-between items-center p-3 border-b border-neon-blue">
            <h3 class="text-lg font-bold text-neon-cyan">チャット</h3>
            <div class="flex space-x-2">
              <button onclick="app.toggleView()" class="text-gray-400 hover:text-neon-cyan">
                <span id="chat-toggle-icon">💬</span>
              </button>
              <button onclick="app.minimize()" class="text-gray-400 hover:text-neon-cyan">
                _
              </button>
            </div>
          </div>
          
          <!-- Chat Content -->
          <div class="flex-1 flex">
            <!-- Conversations List -->
            <div id="conversations-panel" class="w-1/3 border-r border-gray-600">
              <div class="p-2">
                <h4 class="text-sm font-bold text-neon-cyan mb-2">会話</h4>
                <div id="conversations-list" class="space-y-1">
                  <!-- Conversations will be loaded here -->
                </div>
              </div>
            </div>
            
            <!-- Chat Messages -->
            <div id="chat-panel" class="flex-1 flex flex-col">
              <div id="chat-messages" class="flex-1 p-3 overflow-y-auto">
                <div class="text-center text-gray-400 text-sm">
                  会話を選択してください
                </div>
              </div>
              
              <!-- Message Input -->
              <div id="message-input-container" class="hidden border-t border-gray-600 p-2">
                <div class="flex space-x-2">
                  <input 
                    type="text" 
                    id="message-input" 
                    placeholder="メッセージを入力..."
                    class="flex-1 px-2 py-1 bg-game-bg border border-neon-blue rounded text-white text-sm focus:outline-none focus:border-neon-cyan"
                  >
                  <button onclick="app.sendMessage()" class="px-3 py-1 bg-neon-blue text-white rounded text-sm hover:bg-neon-cyan">
                    送信
                  </button>
                </div>
                <div id="chat-actions" class="mt-2 flex space-x-2">
                  <button onclick="app.showGameInviteOptions()" class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                    ゲーム招待
                  </button>
                  <button onclick="app.viewProfile()" class="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                    プロフィール
                  </button>
                  <button onclick="app.blockUser()" class="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">
                    ブロック
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Game Invite Modal -->
      <div id="game-invite-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
        <div class="bg-game-text p-6 rounded-lg border border-neon-blue max-w-sm w-full mx-4">
          <h3 class="text-lg font-bold text-neon-cyan mb-4">ゲーム招待</h3>
          <div class="space-y-3">
            <button onclick="app.sendGameInvite('pong')" class="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Pongゲームに招待
            </button>
            <button onclick="app.sendGameInvite('tank')" class="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Tank Battleに招待
            </button>
            <button onclick="app.closeGameInviteModal()" class="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              キャンセル
            </button>
          </div>
        </div>
      </div>
    `
  }

  public renderMinimizedChat(): string {
    return `
      <div id="chat-minimized" class="fixed bottom-4 right-4 bg-game-text border border-neon-blue rounded-lg p-3 cursor-pointer z-50" onclick="app.restore()">
        <div class="flex items-center space-x-2">
          <span class="text-neon-cyan">💬</span>
          <span class="text-white text-sm">チャット</span>
          <span id="unread-count" class="hidden bg-red-500 text-white text-xs rounded-full px-2 py-1">0</span>
        </div>
      </div>
    `
  }
}