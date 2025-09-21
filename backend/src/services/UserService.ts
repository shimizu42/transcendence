import { User, FriendRequest, UserStats, GameTypeStats, MatchHistory } from '../models/User';
import crypto from 'crypto';

export class UserService {
  private users: Map<string, User> = new Map();
  private usersByUsername: Map<string, User> = new Map();
  private matchHistory: Map<string, MatchHistory[]> = new Map();

  createUser(username: string, password: string): User {
    if (this.usersByUsername.has(username)) {
      throw new Error('Username already exists');
    }

    const hashedPassword = this.hashPassword(password);
    const defaultStats: UserStats = {
      totalGames: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      pongStats: this.createDefaultGameTypeStats(),
      tankStats: this.createDefaultGameTypeStats(),
      tournamentWins: 0,
      longestWinStreak: 0,
      currentWinStreak: 0
    };

    const user: User = {
      id: crypto.randomUUID(),
      username,
      password: hashedPassword,
      isOnline: false,
      isInGame: false,
      friends: [],
      friendRequests: [],
      stats: defaultStats,
      createdAt: new Date()
    };

    this.users.set(user.id, user);
    this.usersByUsername.set(username, user);
    this.matchHistory.set(user.id, []);
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
      user.lastLoginAt = new Date();
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

  private createDefaultGameTypeStats(): GameTypeStats {
    return {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      averageGameDuration: 0,
      bestScore: 0
    };
  }

  // Profile Update Methods
  updateUserProfile(userId: string, updates: {
    displayName?: string;
    bio?: string;
    email?: string;
  }): User | null {
    const user = this.users.get(userId);
    if (!user) return null;

    if (updates.displayName !== undefined) user.displayName = updates.displayName;
    if (updates.bio !== undefined) user.bio = updates.bio;
    if (updates.email !== undefined) user.email = updates.email;

    return user;
  }

  updateUserAvatar(userId: string, avatarPath: string): User | null {
    const user = this.users.get(userId);
    if (!user) return null;

    user.avatar = avatarPath;
    return user;
  }

  getDefaultAvatars(): string[] {
    return [
      '/avatars/default1.png',
      '/avatars/default2.png',
      '/avatars/default3.png',
      '/avatars/default4.png',
      '/avatars/default5.png'
    ];
  }

  // Friend System Methods
  sendFriendRequest(fromUserId: string, toUserId: string): FriendRequest | null {
    const fromUser = this.users.get(fromUserId);
    const toUser = this.users.get(toUserId);

    if (!fromUser || !toUser || fromUserId === toUserId) return null;

    // Check if already friends
    if (fromUser.friends.includes(toUserId)) return null;

    // Check if request already exists
    const existingRequest = toUser.friendRequests.find(
      req => req.fromUserId === fromUserId && req.status === 'pending'
    );
    if (existingRequest) return null;

    const friendRequest: FriendRequest = {
      id: crypto.randomUUID(),
      fromUserId,
      toUserId,
      status: 'pending',
      createdAt: new Date()
    };

    toUser.friendRequests.push(friendRequest);
    return friendRequest;
  }

  respondToFriendRequest(userId: string, requestId: string, response: 'accepted' | 'declined'): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    const requestIndex = user.friendRequests.findIndex(req => req.id === requestId);
    if (requestIndex === -1) return false;

    const request = user.friendRequests[requestIndex];
    request.status = response;

    if (response === 'accepted') {
      const fromUser = this.users.get(request.fromUserId);
      if (fromUser) {
        // Add to both users' friend lists
        user.friends.push(request.fromUserId);
        fromUser.friends.push(userId);
      }
    }

    // Remove request from pending list
    user.friendRequests.splice(requestIndex, 1);
    return true;
  }

  removeFriend(userId: string, friendId: string): boolean {
    const user = this.users.get(userId);
    const friend = this.users.get(friendId);

    if (!user || !friend) return false;

    // Remove from both users' friend lists
    user.friends = user.friends.filter(id => id !== friendId);
    friend.friends = friend.friends.filter(id => id !== userId);

    return true;
  }

  getFriends(userId: string): User[] {
    const user = this.users.get(userId);
    if (!user) return [];

    return user.friends.map(friendId => this.users.get(friendId)).filter(Boolean) as User[];
  }

  getFriendRequests(userId: string): FriendRequest[] {
    const user = this.users.get(userId);
    return user?.friendRequests || [];
  }

  // Statistics and Match History Methods
  recordMatchResult(result: {
    gameId: string;
    gameType: 'pong' | 'tank';
    gameMode: '2player' | '4player' | 'tournament';
    players: Array<{
      playerId: string;
      score: number;
      result: 'win' | 'loss';
    }>;
    duration: number;
    isRanked?: boolean;
    tournamentId?: string;
  }): void {
    const datePlayed = new Date();

    result.players.forEach(playerResult => {
      const user = this.users.get(playerResult.playerId);
      if (!user) return;

      // Update user stats
      user.stats.totalGames++;
      if (playerResult.result === 'win') {
        user.stats.wins++;
        user.stats.currentWinStreak++;
        if (user.stats.currentWinStreak > user.stats.longestWinStreak) {
          user.stats.longestWinStreak = user.stats.currentWinStreak;
        }
      } else {
        user.stats.losses++;
        user.stats.currentWinStreak = 0;
      }
      user.stats.winRate = user.stats.totalGames > 0 ? user.stats.wins / user.stats.totalGames : 0;

      // Update game type specific stats
      const gameTypeStats = result.gameType === 'pong' ? user.stats.pongStats : user.stats.tankStats;
      gameTypeStats.gamesPlayed++;
      if (playerResult.result === 'win') {
        gameTypeStats.wins++;
      } else {
        gameTypeStats.losses++;
      }
      gameTypeStats.winRate = gameTypeStats.gamesPlayed > 0 ? gameTypeStats.wins / gameTypeStats.gamesPlayed : 0;

      // Update average game duration
      const totalDuration = gameTypeStats.averageGameDuration * (gameTypeStats.gamesPlayed - 1) + result.duration;
      gameTypeStats.averageGameDuration = totalDuration / gameTypeStats.gamesPlayed;

      // Update best score
      if (playerResult.score > gameTypeStats.bestScore) {
        gameTypeStats.bestScore = playerResult.score;
      }

      // Tournament wins
      if (result.gameMode === 'tournament' && playerResult.result === 'win') {
        user.stats.tournamentWins++;
      }

      // Create match history entry
      const opponentData = result.players.filter(p => p.playerId !== playerResult.playerId);
      const matchHistoryEntry: MatchHistory = {
        id: crypto.randomUUID(),
        gameId: result.gameId,
        gameType: result.gameType,
        gameMode: result.gameMode,
        playerId: playerResult.playerId,
        opponentIds: opponentData.map(p => p.playerId),
        opponentNames: opponentData.map(p => this.users.get(p.playerId)?.username || 'Unknown'),
        result: playerResult.result,
        score: playerResult.score,
        opponentScores: opponentData.map(p => p.score),
        duration: result.duration,
        datePlayed,
        isRanked: result.isRanked || false,
        tournamentId: result.tournamentId
      };

      const userHistory = this.matchHistory.get(playerResult.playerId) || [];
      userHistory.unshift(matchHistoryEntry); // Add to beginning for latest first

      // Keep only last 100 matches
      if (userHistory.length > 100) {
        userHistory.splice(100);
      }

      this.matchHistory.set(playerResult.playerId, userHistory);
    });
  }

  getMatchHistory(userId: string, limit: number = 20, offset: number = 0): MatchHistory[] {
    const history = this.matchHistory.get(userId) || [];
    return history.slice(offset, offset + limit);
  }

  getUserStats(userId: string): UserStats | null {
    const user = this.users.get(userId);
    return user?.stats || null;
  }

  getLeaderboard(gameType?: 'pong' | 'tank', limit: number = 10): Array<{
    user: User;
    stats: UserStats;
    rank: number;
  }> {
    const users = Array.from(this.users.values());

    const sortedUsers = users.sort((a, b) => {
      if (gameType) {
        const aStats = gameType === 'pong' ? a.stats.pongStats : a.stats.tankStats;
        const bStats = gameType === 'pong' ? b.stats.pongStats : b.stats.tankStats;

        if (aStats.wins !== bStats.wins) return bStats.wins - aStats.wins;
        return bStats.winRate - aStats.winRate;
      } else {
        if (a.stats.wins !== b.stats.wins) return b.stats.wins - a.stats.wins;
        return b.stats.winRate - a.stats.winRate;
      }
    });

    return sortedUsers.slice(0, limit).map((user, index) => ({
      user,
      stats: user.stats,
      rank: index + 1
    }));
  }

  // Search users for friend functionality
  searchUsers(query: string, excludeUserId?: string): User[] {
    const users = Array.from(this.users.values());
    const searchQuery = query.toLowerCase();

    return users
      .filter(user =>
        user.id !== excludeUserId &&
        (user.username.toLowerCase().includes(searchQuery) ||
         user.displayName?.toLowerCase().includes(searchQuery))
      )
      .slice(0, 10); // Limit search results
  }
}