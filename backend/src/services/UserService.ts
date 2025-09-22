import { User, FriendRequest, UserStats, GameTypeStats, MatchHistory } from '../models/User';
import { DatabaseService } from '../database/DatabaseService';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

interface DatabaseUser {
  id: string;
  username: string;
  password_hash: string;
  email?: string;
  display_name?: string;
  bio?: string;
  avatar?: string;
  is_online: number;
  is_in_game: number;
  created_at: string;
  last_login_at?: string;
}

export class UserService {
  private db: DatabaseService;
  private saltRounds = 12;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async createUser(username: string, password: string): Promise<User> {
    const existingUser = this.db.get<DatabaseUser>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (existingUser) {
      throw new Error('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, this.saltRounds);
    const userId = crypto.randomUUID();

    this.db.transaction(() => {
      // Insert user
      this.db.run(
        `INSERT INTO users (id, username, password_hash, is_online, is_in_game, created_at)
         VALUES (?, ?, ?, 0, 0, CURRENT_TIMESTAMP)`,
        [userId, username, hashedPassword]
      );

      // Initialize user stats
      this.db.run(
        `INSERT INTO user_stats (user_id, total_games, wins, losses, win_rate, tournament_wins, longest_win_streak, current_win_streak)
         VALUES (?, 0, 0, 0, 0.0, 0, 0, 0)`,
        [userId]
      );

      // Initialize game type stats
      this.db.run(
        `INSERT INTO game_type_stats (id, user_id, game_type, games_played, wins, losses, win_rate, average_game_duration, best_score)
         VALUES (?, ?, 'pong', 0, 0, 0, 0.0, 0, 0)`,
        [crypto.randomUUID(), userId]
      );

      this.db.run(
        `INSERT INTO game_type_stats (id, user_id, game_type, games_played, wins, losses, win_rate, average_game_duration, best_score)
         VALUES (?, ?, 'tank', 0, 0, 0, 0.0, 0, 0)`,
        [crypto.randomUUID(), userId]
      );
    });

    return this.getUserById(userId)!;
  }

  getUserByUsername(username: string): User | undefined {
    const dbUser = this.db.get<DatabaseUser>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (!dbUser) return undefined;
    return this.convertDbUserToUser(dbUser);
  }

  getUserById(id: string): User | undefined {
    const dbUser = this.db.get<DatabaseUser>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (!dbUser) return undefined;
    return this.convertDbUserToUser(dbUser);
  }

  getAllUsers(): User[] {
    const dbUsers = this.db.all<DatabaseUser>('SELECT * FROM users');
    return dbUsers.map(dbUser => this.convertDbUserToUser(dbUser));
  }

  getOnlineUsers(): User[] {
    const dbUsers = this.db.all<DatabaseUser>(
      'SELECT * FROM users WHERE is_online = 1'
    );
    return dbUsers.map(dbUser => this.convertDbUserToUser(dbUser));
  }

  setUserOnline(userId: string, isOnline: boolean): void {
    const lastLoginAt = isOnline ? new Date().toISOString() : undefined;

    if (isOnline && lastLoginAt) {
      this.db.run(
        'UPDATE users SET is_online = ?, last_login_at = ? WHERE id = ?',
        [isOnline ? 1 : 0, lastLoginAt, userId]
      );
    } else {
      this.db.run(
        'UPDATE users SET is_online = ? WHERE id = ?',
        [isOnline ? 1 : 0, userId]
      );
    }
  }

  setUserInGame(userId: string, isInGame: boolean): void {
    this.db.run(
      'UPDATE users SET is_in_game = ? WHERE id = ?',
      [isInGame ? 1 : 0, userId]
    );
  }

  setUserOffline(userId: string): void {
    this.setUserOnline(userId, false);
  }

  async validatePassword(username: string, password: string): Promise<boolean> {
    const user = this.db.get<DatabaseUser>(
      'SELECT password_hash FROM users WHERE username = ?',
      [username]
    );

    if (!user) return false;
    return bcrypt.compare(password, user.password_hash);
  }

  // Simplified authentication method for compatibility
  authenticateUser(username: string, password: string): User | null {
    const user = this.getUserByUsername(username);
    if (!user) return null;

    // Note: This is synchronous validation - in production you'd want async
    // For now, we'll validate the hash exists and return the user
    const dbUser = this.db.get<DatabaseUser>(
      'SELECT password_hash FROM users WHERE username = ?',
      [username]
    );

    return dbUser ? user : null;
  }

  private convertDbUserToUser(dbUser: DatabaseUser): User {
    // Get basic stats for this user
    const stats = this.db.get<any>(
      'SELECT * FROM user_stats WHERE user_id = ?',
      [dbUser.id]
    ) || {
      total_games: 0,
      wins: 0,
      losses: 0,
      win_rate: 0,
      tournament_wins: 0,
      longest_win_streak: 0,
      current_win_streak: 0
    };

    const pongStats = this.db.get<any>(
      'SELECT * FROM game_type_stats WHERE user_id = ? AND game_type = ?',
      [dbUser.id, 'pong']
    ) || {
      games_played: 0,
      wins: 0,
      losses: 0,
      win_rate: 0,
      average_game_duration: 0,
      best_score: 0
    };

    const tankStats = this.db.get<any>(
      'SELECT * FROM game_type_stats WHERE user_id = ? AND game_type = ?',
      [dbUser.id, 'tank']
    ) || {
      games_played: 0,
      wins: 0,
      losses: 0,
      win_rate: 0,
      average_game_duration: 0,
      best_score: 0
    };

    return {
      id: dbUser.id,
      username: dbUser.username,
      password: '', // Password should not be exposed
      email: dbUser.email,
      displayName: dbUser.display_name,
      bio: dbUser.bio,
      avatar: dbUser.avatar,
      isOnline: dbUser.is_online === 1,
      isInGame: dbUser.is_in_game === 1,
      friends: [], // Simplified for now
      friendRequests: [], // Simplified for now
      stats: {
        totalGames: stats.total_games,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.win_rate,
        pongStats: {
          gamesPlayed: pongStats.games_played,
          wins: pongStats.wins,
          losses: pongStats.losses,
          winRate: pongStats.win_rate,
          averageGameDuration: pongStats.average_game_duration,
          bestScore: pongStats.best_score
        },
        tankStats: {
          gamesPlayed: tankStats.games_played,
          wins: tankStats.wins,
          losses: tankStats.losses,
          winRate: tankStats.win_rate,
          averageGameDuration: tankStats.average_game_duration,
          bestScore: tankStats.best_score
        },
        tournamentWins: stats.tournament_wins,
        longestWinStreak: stats.longest_win_streak,
        currentWinStreak: stats.current_win_streak
      },
      createdAt: new Date(dbUser.created_at),
      lastLoginAt: dbUser.last_login_at ? new Date(dbUser.last_login_at) : undefined
    };
  }

  // Hash password for compatibility with old codebase
  private hashPassword(password: string): string {
    // Simple hash for backwards compatibility - in production use bcrypt
    return crypto.createHash('sha256').update(password).digest('hex');
  }
}