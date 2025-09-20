export interface Player {
  id: string;
  username: string;
  score: number;
  lives: number;
  paddlePosition: number;
  isAlive: boolean;
  side: 'top' | 'bottom' | 'left' | 'right';
}

export interface GameState {
  gameType: '2player' | '4player';
  players: { [key: string]: Player };
  ball: {
    x: number;
    y: number;
    z: number;
    velocityX: number;
    velocityY: number;
    velocityZ: number;
  };
  gameStatus: 'waiting' | 'playing' | 'finished';
  winner?: string;
  alivePlayers: string[];
}

export interface TankPlayer {
  id: string;
  username: string;
  lives: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: number;
  turretRotation: number;
  isAlive: boolean;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export interface Bullet {
  id: string;
  playerId: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  direction: {
    x: number;
    y: number;
    z: number;
  };
  speed: number;
  isActive: boolean;
}

export interface TankGameState {
  gameType: '2player' | '4player';
  players: { [key: string]: TankPlayer };
  bullets: { [key: string]: Bullet };
  gameStatus: 'waiting' | 'playing' | 'finished';
  winner?: string;
  alivePlayers: string[];
}

export interface GameUpdate {
  type: 'paddle' | 'ball' | 'score' | 'playerEliminated' | 'gameEnd';
  data: any;
}

export interface TankControls {
  moveForward: number;
  turn: number;
  turretTurn: number;
  shoot: boolean;
}