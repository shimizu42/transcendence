import { WebSocket } from 'ws';
import { UserService } from './UserService';
import { GameService } from './GameService';
export declare class WebSocketService {
    private connections;
    private userService;
    private gameService;
    constructor(userService: UserService, gameService: GameService);
    handleConnection(connection: WebSocket, request: any): void;
    private handleMessage;
    private handleAuthentication;
    private handleGameInvite;
    private handleGameInviteResponse;
    private handleJoinGame;
    private handlePaddleMove;
    private handleJoinQueue4Player;
    private handleLeaveQueue4Player;
    private handleLeaveGame;
    private handleDisconnection;
    private startGameStateUpdates;
    private sendGameState;
    private sendGameEnd;
    private broadcastUserUpdate;
    private findConnectionByUserId;
    private sendToConnection;
    private generateConnectionId;
}
//# sourceMappingURL=WebSocketService.d.ts.map