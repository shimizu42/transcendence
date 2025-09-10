export interface GameState {
  player1: {
    id: string;
    username: string;
    score: number;
    paddleY: number;
  };
  player2: {
    id: string;
    username: string;
    score: number;
    paddleY: number;
  };
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
}

export interface GameUpdate {
  type: 'paddle' | 'ball' | 'score' | 'gameEnd';
  data: any;
}