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

export interface GameUpdate {
  type: 'paddle' | 'ball' | 'score' | 'playerEliminated' | 'gameEnd';
  data: any;
}