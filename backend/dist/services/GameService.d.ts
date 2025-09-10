import { Game, GameInvitation } from '../models/User';
export declare class GameService {
    private games;
    private invitations;
    private gameIntervals;
    createInvitation(fromUserId: string, toUserId: string): GameInvitation;
    getInvitation(id: string): GameInvitation | undefined;
    acceptInvitation(id: string): Game | null;
    declineInvitation(id: string): boolean;
    createGame(player1Id: string, player2Id: string): Game;
    getGame(id: string): Game | undefined;
    startGame(gameId: string): boolean;
    updatePaddle(gameId: string, playerId: string, direction: number): boolean;
    endGame(gameId: string, winner?: string): boolean;
    private startGameLoop;
    private updateBall;
    private checkCollisions;
    private checkScore;
    private resetBall;
    removeGame(gameId: string): void;
}
//# sourceMappingURL=GameService.d.ts.map