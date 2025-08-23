export interface User {
  id: string
  username: string
  displayName: string
  avatar?: string
  isOnline: boolean
  lastSeen: Date
  wins: number
  losses: number
  totalGames: number
}

export interface Match {
  id: string
  player1Id: string
  player2Id: string
  winnerId?: string
  score: { player1: number, player2: number }
  playedAt: Date
  duration?: number
}

export interface UserStats {
  wins: number
  losses: number
  totalGames: number
  winRate: number
}

export class AuthManager {
  private token: string | null = null
  private currentUser: User | null = null

  constructor() {
    // Check for stored token on initialization
    this.token = localStorage.getItem('auth_token')
    if (this.token) {
      // Try to load user info asynchronously, but don't block initialization
      this.loadCurrentUser().then(() => {
        // User info loaded successfully, trigger a re-render
        window.dispatchEvent(new CustomEvent('user-loaded'))
      }).catch(() => {
        // Invalid token, clear it
        this.logout()
      })
    }
  }

  public isAuthenticated(): boolean {
    return this.token !== null
  }

  public getCurrentUser(): User | null {
    return this.currentUser
  }

  public getToken(): string | null {
    return this.token
  }

  private getAuthHeaders(): { [key: string]: string } {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json'
    }
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    
    return headers
  }

  public async register(data: {
    username: string
    displayName: string
    password: string
    avatar?: string
  }): Promise<{ user: User, token: string }> {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Registration failed')
    }

    const result = await response.json()
    this.token = result.token
    this.currentUser = result.user
    if (this.token) {
      localStorage.setItem('auth_token', this.token)
    }
    
    return result
  }

  public async login(username: string, password: string): Promise<{ user: User, token: string }> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Login failed')
    }

    const result = await response.json()
    this.token = result.token
    this.currentUser = result.user
    if (this.token) {
      localStorage.setItem('auth_token', this.token)
    }
    
    return result
  }


  public logout(): void {
    this.token = null
    this.currentUser = null
    localStorage.removeItem('auth_token')
  }

  public async loadCurrentUser(): Promise<User> {
    if (!this.token) {
      throw new Error('Not authenticated')
    }
    
    const response = await fetch('/api/users/me', {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to load user profile')
    }

    this.currentUser = await response.json()
    return this.currentUser!
  }

  public async updateProfile(data: {
    displayName?: string
    avatar?: string
  }): Promise<User> {
    if (!this.token) {
      throw new Error('Not authenticated')
    }
    
    const response = await fetch('/api/users/me', {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update profile')
    }

    this.currentUser = await response.json()
    return this.currentUser!
  }

  public async searchUsers(query: string): Promise<User[]> {
    if (!this.token) {
      throw new Error('Not authenticated')
    }
    
    const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to search users')
    }

    return await response.json()
  }

  public async getUserById(id: string): Promise<User> {
    if (!this.token) {
      throw new Error('Not authenticated')
    }
    
    const response = await fetch(`/api/users/${id}`, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('User not found')
    }

    return await response.json()
  }

  public async getFriends(): Promise<User[]> {
    if (!this.token) {
      throw new Error('Not authenticated')
    }
    
    const response = await fetch('/api/users/me/friends', {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to load friends')
    }

    return await response.json()
  }

  public async addFriend(friendId: string): Promise<void> {
    console.log(`AuthManager.addFriend called with friendId: ${friendId}`)
    
    if (!this.token) {
      throw new Error('Not authenticated')
    }
    
    const url = `/api/users/me/friends/${friendId}`
    const headers = {
      'Authorization': `Bearer ${this.token}`
    }
    
    console.log('Request URL:', url)
    console.log('Request headers:', headers)
    console.log('Token:', this.token)
    
    const response = await fetch(url, {
      method: 'POST',
      headers
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', response.headers)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response:', errorText)
      
      let errorMessage = 'Failed to add friend'
      try {
        const error = JSON.parse(errorText)
        errorMessage = error.error || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      
      throw new Error(errorMessage)
    }
    
    const successResponse = await response.text()
    console.log('Success response:', successResponse)
  }

  public async removeFriend(friendId: string): Promise<void> {
    if (!this.token) {
      throw new Error('Not authenticated')
    }
    
    const response = await fetch(`/api/users/me/friends/${friendId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to remove friend')
    }
  }

  public async getStats(userId?: string): Promise<UserStats> {
    if (!this.token) {
      throw new Error('Not authenticated')
    }
    
    const url = userId ? `/api/users/${userId}/stats` : '/api/users/me/stats'
    const response = await fetch(url, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to load statistics')
    }

    return await response.json()
  }

  public async getMatchHistory(userId?: string): Promise<Match[]> {
    if (!this.token) {
      throw new Error('Not authenticated')
    }
    
    const url = userId ? `/api/users/${userId}/matches` : '/api/users/me/matches'
    const response = await fetch(url, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to load match history')
    }

    return await response.json()
  }

  public async getDefaultAvatars(): Promise<string[]> {
    const response = await fetch('/api/avatars/defaults')

    if (!response.ok) {
      throw new Error('Failed to load default avatars')
    }

    return await response.json()
  }

  public async setAvatar(avatarUrl: string): Promise<User> {
    if (!this.token) {
      throw new Error('Not authenticated')
    }
    
    const response = await fetch('/api/users/me/avatar', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ avatarUrl })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to set avatar')
    }

    const result = await response.json()
    this.currentUser = result.user
    return this.currentUser!
  }
}