export interface User {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  isOnline: boolean;
  isInGame: boolean;
  friends: string[];
  friendRequests: FriendRequest[];
  stats: UserStats;
  createdAt: Date | string;
  lastLoginAt?: Date | string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  fromUser?: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  };
}

export interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  pongStats: GameTypeStats;
  tankStats: GameTypeStats;
  tournamentWins: number;
  longestWinStreak: number;
  currentWinStreak: number;
}

export interface GameTypeStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  averageGameDuration: number;
  bestScore: number;
}

export interface MatchHistory {
  id: string;
  gameId: string;
  gameType: 'pong' | 'tank';
  gameMode: '2player' | '4player' | 'tournament';
  playerId: string;
  opponentIds: string[];
  opponentNames: string[];
  result: 'win' | 'loss';
  score: number;
  opponentScores: number[];
  duration: number;
  datePlayed: Date | string;
  isRanked: boolean;
  tournamentId?: string;
}

export interface GameInvitation {
  id: string;
  fromUser: User;
  toUser: User;
  status: 'pending' | 'accepted' | 'declined';
}

export interface LeaderboardEntry {
  user: User;
  stats: UserStats;
  rank: number;
}