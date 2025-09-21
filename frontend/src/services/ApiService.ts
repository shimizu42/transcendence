import { User, GameInvitation, FriendRequest, UserStats, MatchHistory, LeaderboardEntry } from '../types/User';

export class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  async register(username: string, password: string): Promise<User> {
    console.log('Making registration request to:', `${this.baseUrl}/auth/register`);
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    console.log('Registration response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Registration failed:', errorText);
      throw new Error(`Registration failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('Registration result:', result);
    return result;
  }

  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    console.log('Making login request to:', `${this.baseUrl}/auth/login`);
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    console.log('Login response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Login failed:', errorText);
      throw new Error(`Login failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('Login result:', result);
    return result;
  }

  async getUsers(): Promise<User[]> {
    const response = await fetch(`${this.baseUrl}/users`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    return response.json();
  }

  async sendGameInvitation(toUserId: string): Promise<GameInvitation> {
    const response = await fetch(`${this.baseUrl}/game/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify({ toUserId }),
    });

    if (!response.ok) {
      throw new Error('Failed to send invitation');
    }

    return response.json();
  }

  // Profile methods
  async updateProfile(updates: { displayName?: string; bio?: string; email?: string }): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    return response.json();
  }

  async getUserById(userId: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    return response.json();
  }

  // Friend system methods
  async getFriends(): Promise<User[]> {
    const response = await fetch(`${this.baseUrl}/users/friends`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch friends');
    }

    return response.json();
  }

  async getFriendRequests(): Promise<FriendRequest[]> {
    const response = await fetch(`${this.baseUrl}/users/friend-requests`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch friend requests');
    }

    return response.json();
  }

  async sendFriendRequest(toUserId: string): Promise<FriendRequest> {
    const response = await fetch(`${this.baseUrl}/users/friend-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify({ toUserId }),
    });

    if (!response.ok) {
      throw new Error('Failed to send friend request');
    }

    return response.json();
  }

  async respondToFriendRequest(requestId: string, response: 'accepted' | 'declined'): Promise<void> {
    const res = await fetch(`${this.baseUrl}/users/friend-request/${requestId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify({ response }),
    });

    if (!res.ok) {
      throw new Error('Failed to respond to friend request');
    }
  }

  async removeFriend(friendId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/users/friends/${friendId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to remove friend');
    }
  }

  async searchUsers(query: string): Promise<User[]> {
    const response = await fetch(`${this.baseUrl}/users/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to search users');
    }

    return response.json();
  }

  // Statistics methods
  async getUserStats(userId: string): Promise<UserStats> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/stats`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user stats');
    }

    return response.json();
  }

  async getMatchHistory(userId: string, limit: number = 20, offset: number = 0): Promise<MatchHistory[]> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/matches?limit=${limit}&offset=${offset}`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch match history');
    }

    return response.json();
  }

  async getLeaderboard(gameType?: 'pong' | 'tank', limit: number = 10): Promise<LeaderboardEntry[]> {
    const url = gameType
      ? `${this.baseUrl}/leaderboard?gameType=${gameType}&limit=${limit}`
      : `${this.baseUrl}/leaderboard?limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch leaderboard');
    }

    return response.json();
  }

  private getToken(): string {
    return localStorage.getItem('token') || '';
  }
}