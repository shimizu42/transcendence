export interface User {
  id: string;
  username: string;
  password: string;
  email?: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  isOnline: boolean;
  isInGame: boolean;
  socketId?: string;
  friends: string[];
  friendRequests: FriendRequest[];
  stats: UserStats;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
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
  datePlayed: Date;
  isRanked: boolean;
  tournamentId?: string;
}

export interface GameInvitation {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

export interface GamePlayer {
  id: string;
  username: string;
  score: number;
  lives: number;
  paddlePosition: number;
  isAlive: boolean;
  side: 'top' | 'bottom' | 'left' | 'right';
}

export interface Game {
  id: string;
  gameType: '2player' | '4player';
  players: { [key: string]: GamePlayer };
  playerIds: string[];
  maxPlayers: number;
  ballX: number;
  ballY: number;
  ballZ: number;
  ballVelocityX: number;
  ballVelocityY: number;
  ballVelocityZ: number;
  status: 'waiting' | 'playing' | 'finished';
  winner?: string;
  alivePlayers: string[];
  createdAt: Date;
}

export interface TournamentMatch {
  id: string;
  round: number;
  matchNumber: number;
  player1Id?: string;
  player2Id?: string;
  winnerId?: string;
  gameId?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
}

export interface Tournament {
  id: string;
  gameType: 'pong' | 'tank';
  playerIds: string[];
  matches: TournamentMatch[];
  currentRound: number;
  status: 'waiting' | 'semifinal' | 'final' | 'finished';
  winnerId?: string;
  createdAt: Date;
}