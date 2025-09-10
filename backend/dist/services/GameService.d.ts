import { Game, GameInvitation } from '../models/User';
export declare class GameService {
    private games;
    private invitations;
    private gameIntervals;
    private waitingRoom4Player;
    createInvitation(fromUserId: string, toUserId: string): GameInvitation;
    getInvitation(id: string): GameInvitation | undefined;
    acceptInvitation(id: string): Game | null;
    declineInvitation(id: string): boolean;
    createGame(playerIds: string[], gameType?: '2player' | '4player'): Game;
    getGame(id: string): Game | undefined;
    startGame(gameId: string): boolean;
    updatePaddle(gameId: string, playerId: string, direction: number): boolean;
    endGame(gameId: string, winner?: string): boolean;
    private startGameLoop;
    private updateBall;
    private checkCollisions;
    private checkScore;
    private resetBall;
    private checkCollisions4Player;
    private checkBounds4Player;
    private playerLoseLife;
    removeGame(gameId: string): void;
    joinQueue4Player(playerId: string): Game | null;
    leaveQueue4Player(playerId: string): void;
    getWaitingCount4Player(): number;
}
//# sourceMappingURL=GameService.d.ts.map