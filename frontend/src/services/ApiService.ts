import { User, GameInvitation } from '../types/User';

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

  private getToken(): string {
    return localStorage.getItem('token') || '';
  }
}