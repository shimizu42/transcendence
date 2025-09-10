import { User } from '../models/User';
import crypto from 'crypto';

export class UserService {
  private users: Map<string, User> = new Map();
  private usersByUsername: Map<string, User> = new Map();

  createUser(username: string, password: string): User {
    if (this.usersByUsername.has(username)) {
      throw new Error('Username already exists');
    }

    const hashedPassword = this.hashPassword(password);
    const user: User = {
      id: crypto.randomUUID(),
      username,
      password: hashedPassword,
      isOnline: false,
      isInGame: false
    };

    this.users.set(user.id, user);
    this.usersByUsername.set(username, user);
    return user;
  }

  getUserByUsername(username: string): User | undefined {
    return this.usersByUsername.get(username);
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  authenticateUser(username: string, password: string): User | null {
    const user = this.getUserByUsername(username);
    if (!user) return null;

    const hashedPassword = this.hashPassword(password);
    if (user.password !== hashedPassword) return null;

    return user;
  }

  setUserOnline(userId: string, socketId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.isOnline = true;
      user.socketId = socketId;
    }
  }

  setUserOffline(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.isOnline = false;
      user.isInGame = false;
      delete user.socketId;
    }
  }

  setUserInGame(userId: string, inGame: boolean): void {
    const user = this.users.get(userId);
    if (user) {
      user.isInGame = inGame;
    }
  }

  getOnlineUsers(): User[] {
    return Array.from(this.users.values()).filter(user => user.isOnline);
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }
}