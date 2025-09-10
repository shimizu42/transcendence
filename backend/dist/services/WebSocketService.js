"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const ws_1 = require("ws");
const auth_1 = require("../middleware/auth");
class WebSocketService {
    constructor(userService, gameService) {
        this.connections = new Map();
        this.userService = userService;
        this.gameService = gameService;
    }
    handleConnection(connection, request) {
        const connectionId = this.generateConnectionId();
        this.connections.set(connectionId, { socket: connection });
        connection.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                this.handleMessage(connectionId, data);
            }
            catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        });
        connection.on('close', () => {
            this.handleDisconnection(connectionId);
        });
        connection.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.handleDisconnection(connectionId);
        });
    }
    handleMessage(connectionId, message) {
        const connection = this.connections.get(connectionId);
        if (!connection)
            return;
        switch (message.type) {
            case 'authenticate':
                this.handleAuthentication(connectionId, message.data);
                break;
            case 'gameInvite':
                this.handleGameInvite(connectionId, message.data);
                break;
            case 'gameInviteResponse':
                this.handleGameInviteResponse(connectionId, message.data);
                break;
            case 'joinGame':
                this.handleJoinGame(connectionId, message.data);
                break;
            case 'paddleMove':
                this.handlePaddleMove(connectionId, message.data);
                break;
            case 'leaveGame':
                this.handleLeaveGame(connectionId, message.data);
                break;
        }
    }
    handleAuthentication(connectionId, data) {
        const user = (0, auth_1.verifyToken)(data.token);
        if (!user) {
            this.sendToConnection(connectionId, 'authError', { message: 'Invalid token' });
            return;
        }
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.userId = user.id;
            this.userService.setUserOnline(user.id, connectionId);
            this.broadcastUserUpdate();
            this.sendToConnection(connectionId, 'authenticated', { user });
        }
    }
    handleGameInvite(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.userId)
            return;
        const fromUser = this.userService.getUserById(connection.userId);
        const toUser = this.userService.getUserById(data.toUserId);
        if (!fromUser || !toUser || !toUser.isOnline || toUser.isInGame) {
            this.sendToConnection(connectionId, 'inviteError', { message: 'User not available' });
            return;
        }
        const invitation = this.gameService.createInvitation(fromUser.id, toUser.id);
        const toConnection = this.findConnectionByUserId(toUser.id);
        if (toConnection) {
            this.sendToConnection(toConnection, 'gameInvitation', {
                id: invitation.id,
                fromUser: { id: fromUser.id, username: fromUser.username }
            });
        }
    }
    handleGameInviteResponse(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.userId)
            return;
        const invitation = this.gameService.getInvitation(data.invitationId);
        if (!invitation || invitation.toUserId !== connection.userId)
            return;
        if (data.response === 'accept') {
            const game = this.gameService.acceptInvitation(data.invitationId);
            if (game) {
                this.userService.setUserInGame(game.player1Id, true);
                this.userService.setUserInGame(game.player2Id, true);
                const player1Connection = this.findConnectionByUserId(game.player1Id);
                const player2Connection = this.findConnectionByUserId(game.player2Id);
                if (player1Connection) {
                    this.sendToConnection(player1Connection, 'gameStart', { gameId: game.id });
                    this.sendToConnection(player1Connection, 'playerAssignment', { playerId: game.player1Id, playerNumber: 1 });
                }
                if (player2Connection) {
                    this.sendToConnection(player2Connection, 'gameStart', { gameId: game.id });
                    this.sendToConnection(player2Connection, 'playerAssignment', { playerId: game.player2Id, playerNumber: 2 });
                }
                this.gameService.startGame(game.id);
                this.startGameStateUpdates(game.id);
                this.broadcastUserUpdate();
            }
        }
        else {
            this.gameService.declineInvitation(data.invitationId);
            const fromConnection = this.findConnectionByUserId(invitation.fromUserId);
            if (fromConnection) {
                this.sendToConnection(fromConnection, 'inviteDeclined', {});
            }
        }
    }
    handleJoinGame(connectionId, data) {
        const game = this.gameService.getGame(data.gameId);
        if (game) {
            this.sendGameState(data.gameId);
        }
    }
    handlePaddleMove(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.userId)
            return;
        this.gameService.updatePaddle(data.gameId, connection.userId, data.direction);
    }
    handleLeaveGame(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.userId)
            return;
        const game = this.gameService.getGame(data.gameId);
        if (game) {
            this.gameService.endGame(data.gameId);
            this.userService.setUserInGame(game.player1Id, false);
            this.userService.setUserInGame(game.player2Id, false);
            this.broadcastUserUpdate();
        }
    }
    handleDisconnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection && connection.userId) {
            this.userService.setUserOffline(connection.userId);
            this.broadcastUserUpdate();
        }
        this.connections.delete(connectionId);
    }
    startGameStateUpdates(gameId) {
        const interval = setInterval(() => {
            const game = this.gameService.getGame(gameId);
            if (!game || game.status === 'finished') {
                clearInterval(interval);
                if (game && game.status === 'finished') {
                    this.sendGameEnd(gameId, game.winner);
                    this.userService.setUserInGame(game.player1Id, false);
                    this.userService.setUserInGame(game.player2Id, false);
                    this.broadcastUserUpdate();
                }
                return;
            }
            this.sendGameState(gameId);
        }, 16);
    }
    sendGameState(gameId) {
        const game = this.gameService.getGame(gameId);
        if (!game)
            return;
        const player1 = this.userService.getUserById(game.player1Id);
        const player2 = this.userService.getUserById(game.player2Id);
        const gameState = {
            player1: {
                id: game.player1Id,
                username: player1?.username || 'Player 1',
                score: game.player1Score,
                paddleY: game.player1PaddleY
            },
            player2: {
                id: game.player2Id,
                username: player2?.username || 'Player 2',
                score: game.player2Score,
                paddleY: game.player2PaddleY
            },
            ball: {
                x: game.ballX,
                y: game.ballY,
                z: game.ballZ,
                velocityX: game.ballVelocityX,
                velocityY: game.ballVelocityY,
                velocityZ: game.ballVelocityZ
            },
            gameStatus: game.status,
            winner: game.winner
        };
        const player1Connection = this.findConnectionByUserId(game.player1Id);
        const player2Connection = this.findConnectionByUserId(game.player2Id);
        if (player1Connection) {
            this.sendToConnection(player1Connection, 'gameState', gameState);
        }
        if (player2Connection) {
            this.sendToConnection(player2Connection, 'gameState', gameState);
        }
    }
    sendGameEnd(gameId, winnerId) {
        const game = this.gameService.getGame(gameId);
        if (!game)
            return;
        const winner = this.userService.getUserById(winnerId);
        const player1Connection = this.findConnectionByUserId(game.player1Id);
        const player2Connection = this.findConnectionByUserId(game.player2Id);
        const endData = { winner: winner?.username || 'Unknown' };
        if (player1Connection) {
            this.sendToConnection(player1Connection, 'gameEnd', endData);
        }
        if (player2Connection) {
            this.sendToConnection(player2Connection, 'gameEnd', endData);
        }
    }
    broadcastUserUpdate() {
        const users = this.userService.getOnlineUsers().map(user => ({
            id: user.id,
            username: user.username,
            isOnline: user.isOnline,
            isInGame: user.isInGame
        }));
        this.connections.forEach((connection) => {
            if (connection.userId) {
                this.sendToConnection(connection.socket, 'userUpdate', users);
            }
        });
    }
    findConnectionByUserId(userId) {
        for (const connection of this.connections.values()) {
            if (connection.userId === userId) {
                return connection.socket;
            }
        }
        return null;
    }
    sendToConnection(target, type, data) {
        try {
            const socket = typeof target === 'string'
                ? this.connections.get(target)?.socket
                : target;
            if (socket && socket.readyState === ws_1.WebSocket.OPEN) {
                socket.send(JSON.stringify({ type, data }));
            }
        }
        catch (error) {
            console.error('Failed to send WebSocket message:', error);
        }
    }
    generateConnectionId() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
}
exports.WebSocketService = WebSocketService;
//# sourceMappingURL=WebSocketService.js.map