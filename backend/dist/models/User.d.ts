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
export interface Game {
    id: string;
    player1Id: string;
    player2Id: string;
    player1Score: number;
    player2Score: number;
    player1PaddleY: number;
    player2PaddleY: number;
    ballX: number;
    ballY: number;
    ballZ: number;
    ballVelocityX: number;
    ballVelocityY: number;
    ballVelocityZ: number;
    status: 'waiting' | 'playing' | 'finished';
    winner?: string;
    createdAt: Date;
}
//# sourceMappingURL=User.d.ts.map