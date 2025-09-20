export interface User {
  id: string;
  username: string;
  password: string;
  isOnline: boolean;
  isInGame: boolean;
  socketId?: string;
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