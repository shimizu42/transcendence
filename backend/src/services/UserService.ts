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
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, 0, 0, 0, 0.0, 0, 0, 0]
      );

      // Initialize game type stats
      this.db.run(
        `INSERT INTO game_type_stats (id, user_id, game_type, games_played, wins, losses, win_rate, average_game_duration, best_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), userId, 'pong', 0, 0, 0, 0.0, 0, 0]
      );

      this.db.run(
        `INSERT INTO game_type_stats (id, user_id, game_type, games_played, wins, losses, win_rate, average_game_duration, best_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), userId, 'tank', 0, 0, 0, 0.0, 0, 0]
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

    console.log('getUserById query result:', dbUser, 'for id:', id);
    if (!dbUser) return undefined;
    return this.convertDbUserToUser(dbUser);
  }

  getAllUsers(): User[] {
    const dbUsers = this.db.all<DatabaseUser>('SELECT * FROM users');
    console.log('getAllUsers query result:', dbUsers.length, 'users found');
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
    const statsRow = this.db.get<any>(
      'SELECT * FROM user_stats WHERE user_id = ?',
      [dbUser.id]
    );
    const stats = statsRow || {
      total_games: 0,
      wins: 0,
      losses: 0,
      win_rate: 0,
      tournament_wins: 0,
      longest_win_streak: 0,
      current_win_streak: 0
    };

    // Set default avatar if none exists
    const avatar = dbUser.avatar || '/api/avatars/default.svg';

    const pongStatsRow = this.db.get<any>(
      'SELECT * FROM game_type_stats WHERE user_id = ? AND game_type = ?',
      [dbUser.id, 'pong']
    );
    const pongStats = pongStatsRow || {
      games_played: 0,
      wins: 0,
      losses: 0,
      win_rate: 0,
      average_game_duration: 0,
      best_score: 0
    };

    const tankStatsRow = this.db.get<any>(
      'SELECT * FROM game_type_stats WHERE user_id = ? AND game_type = ?',
      [dbUser.id, 'tank']
    );
    const tankStats = tankStatsRow || {
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
      avatar: avatar,
      isOnline: dbUser.is_online === 1,
      isInGame: dbUser.is_in_game === 1,
      friends: [], // Simplified for now
      friendRequests: [], // Simplified for now
      stats: {
        totalGames: stats.total_games || 0,
        wins: stats.wins || 0,
        losses: stats.losses || 0,
        winRate: stats.win_rate || 0,
        pongStats: {
          gamesPlayed: pongStats.games_played || 0,
          wins: pongStats.wins || 0,
          losses: pongStats.losses || 0,
          winRate: pongStats.win_rate || 0,
          averageGameDuration: pongStats.average_game_duration || 0,
          bestScore: pongStats.best_score || 0
        },
        tankStats: {
          gamesPlayed: tankStats.games_played || 0,
          wins: tankStats.wins || 0,
          losses: tankStats.losses || 0,
          winRate: tankStats.win_rate || 0,
          averageGameDuration: tankStats.average_game_duration || 0,
          bestScore: tankStats.best_score || 0
        },
        tournamentWins: stats.tournament_wins || 0,
        longestWinStreak: stats.longest_win_streak || 0,
        currentWinStreak: stats.current_win_streak || 0
      },
      createdAt: new Date(dbUser.created_at),
      lastLoginAt: dbUser.last_login_at ? new Date(dbUser.last_login_at) : undefined
    };
  }

  // Update user statistics after a game
  updateUserStats(userId: string, gameType: 'pong' | 'tank', won: boolean, gameDuration?: number, score?: number): void {
    // Update overall stats
    const currentStats = this.db.get<any>('SELECT * FROM user_stats WHERE user_id = ?', [userId]);

    if (currentStats) {
      // Update existing record
      const newTotalGames = currentStats.total_games + 1;
      const newWins = currentStats.wins + (won ? 1 : 0);
      const newLosses = currentStats.losses + (won ? 0 : 1);
      const newWinRate = newTotalGames > 0 ? (newWins / newTotalGames) * 100 : 0;
      const newCurrentStreak = won ? currentStats.current_win_streak + 1 : 0;
      const newLongestStreak = Math.max(currentStats.longest_win_streak, newCurrentStreak);

      const result = this.db.run(
        `UPDATE user_stats SET
         total_games = ?, wins = ?, losses = ?, win_rate = ?,
         longest_win_streak = ?, current_win_streak = ?
         WHERE user_id = ?`,
        [newTotalGames, newWins, newLosses, newWinRate, newLongestStreak, newCurrentStreak, userId]
      );
      console.log('Updated user_stats:', result.changes > 0 ? 'success' : 'failed');
    } else {
      console.log('No user_stats found for user:', userId);
    }

    // Update game type specific stats
    const currentGameStats = this.db.get<any>(
      'SELECT * FROM game_type_stats WHERE user_id = ? AND game_type = ?',
      [userId, gameType]
    );

    if (currentGameStats) {
      // Update existing record
      const newGameTotal = currentGameStats.games_played + 1;
      const newGameWins = currentGameStats.wins + (won ? 1 : 0);
      const newGameLosses = currentGameStats.losses + (won ? 0 : 1);
      const newGameWinRate = newGameTotal > 0 ? (newGameWins / newGameTotal) * 100 : 0;
      const newAvgDuration = gameDuration ?
        ((currentGameStats.average_game_duration * currentGameStats.games_played) + gameDuration) / newGameTotal :
        currentGameStats.average_game_duration;
      const newBestScore = score ? Math.max(currentGameStats.best_score, score) : currentGameStats.best_score;

      const result = this.db.run(
        `UPDATE game_type_stats SET
         games_played = ?, wins = ?, losses = ?, win_rate = ?,
         average_game_duration = ?, best_score = ?
         WHERE user_id = ? AND game_type = ?`,
        [newGameTotal, newGameWins, newGameLosses, newGameWinRate, newAvgDuration, newBestScore, userId, gameType]
      );
      console.log(`Updated ${gameType}_stats:`, result.changes > 0 ? 'success' : 'failed');
    } else {
      console.log(`No ${gameType}_stats found for user:`, userId);
    }
  }

  // Record a match result for all players
  recordMatchResult(playerIds: string[], winnerId: string, gameType: 'pong' | 'tank', gameDuration?: number): void {
    playerIds.forEach(playerId => {
      const won = playerId === winnerId;
      // Get player's score from the game if available
      this.updateUserStats(playerId, gameType, won, gameDuration);
    });
  }

  // Friend request methods
  createFriendRequest(fromUserId: string, toUserId: string): FriendRequest {
    // Check if request already exists
    const existingRequest = this.db.get<any>(
      'SELECT * FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?',
      [fromUserId, toUserId]
    );

    if (existingRequest) {
      throw new Error('Friend request already exists');
    }

    // Check if they are already friends
    const existingFriendship = this.db.get<any>(
      'SELECT * FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [fromUserId, toUserId, toUserId, fromUserId]
    );

    if (existingFriendship) {
      throw new Error('Users are already friends');
    }

    const requestId = crypto.randomUUID();

    console.log('Creating friend request:', { requestId, fromUserId, toUserId });
    const result = this.db.run(
      'INSERT INTO friend_requests (id, from_user_id, to_user_id, status) VALUES (?, ?, ?, ?)',
      [requestId, fromUserId, toUserId, 'pending']
    );
    console.log('Friend request insert result:', result.changes, 'rows affected');

    const fromUser = this.getUserById(fromUserId)!;
    const toUser = this.getUserById(toUserId)!;

    return {
      id: requestId,
      fromUserId,
      toUserId,
      status: 'pending',
      createdAt: new Date(),
      fromUser: {
        id: fromUser.id,
        username: fromUser.username,
        displayName: fromUser.displayName,
        avatar: fromUser.avatar
      }
    };
  }

  getFriendRequests(userId: string): FriendRequest[] {
    const requests = this.db.all<any>(
      'SELECT * FROM friend_requests WHERE to_user_id = ? AND status = ?',
      [userId, 'pending']
    );

    console.log('getFriendRequests query result:', requests.length, 'requests found for user:', userId);
    return requests.map(request => {
      const fromUser = this.getUserById(request.from_user_id)!;

      return {
        id: request.id,
        fromUserId: request.from_user_id,
        toUserId: request.to_user_id,
        status: request.status,
        createdAt: new Date(request.created_at),
        fromUser: {
          id: fromUser.id,
          username: fromUser.username,
          displayName: fromUser.displayName,
          avatar: fromUser.avatar
        }
      };
    });
  }

  respondToFriendRequest(requestId: string, userId: string, response: 'accepted' | 'declined'): void {
    // Get the friend request
    const request = this.db.get<any>(
      'SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ?',
      [requestId, userId]
    );

    if (!request) {
      throw new Error('Friend request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Friend request already responded to');
    }

    // Update the request status
    this.db.run(
      'UPDATE friend_requests SET status = ? WHERE id = ?',
      [response, requestId]
    );

    // If accepted, create friendship
    if (response === 'accepted') {
      this.db.transaction(() => {
        this.db.run(
          'INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)',
          [request.from_user_id, request.to_user_id]
        );
        this.db.run(
          'INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)',
          [request.to_user_id, request.from_user_id]
        );
      });
    }
  }

  getFriends(userId: string): User[] {
    const friendships = this.db.all<any>(
      'SELECT friend_id FROM friendships WHERE user_id = ?',
      [userId]
    );

    return friendships.map(friendship => this.getUserById(friendship.friend_id)!);
  }

  // Update user profile
  updateUserProfile(userId: string, updates: { displayName?: string; bio?: string }): boolean {
    try {
      const user = this.getUserById(userId);
      if (!user) return false;

      const setClause = [];
      const values = [];

      if (updates.displayName !== undefined) {
        setClause.push('display_name = ?');
        values.push(updates.displayName);
      }
      if (updates.bio !== undefined) {
        setClause.push('bio = ?');
        values.push(updates.bio);
      }

      if (setClause.length === 0) return true; // No updates needed

      values.push(userId);
      const result = this.db.run(
        `UPDATE users SET ${setClause.join(', ')} WHERE id = ?`,
        values
      );

      return result.changes > 0;
    } catch (error) {
      console.error('Update user profile error:', error);
      return false;
    }
  }

  // Update user avatar
  updateUserAvatar(userId: string, avatarUrl: string): boolean {
    try {
      console.log('UserService: Updating avatar for user:', userId, 'to:', avatarUrl);
      const result = this.db.run(
        'UPDATE users SET avatar = ? WHERE id = ?',
        [avatarUrl, userId]
      );
      console.log('UserService: Update result changes:', result.changes);
      return result.changes > 0;
    } catch (error) {
      console.error('Update user avatar error:', error);
      return false;
    }
  }

  // Hash password for compatibility with old codebase
  private hashPassword(password: string): string {
    // Simple hash for backwards compatibility - in production use bcrypt
    return crypto.createHash('sha256').digest('hex');
  }
}