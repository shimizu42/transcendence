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
        console.log('WebSocket: Received message', { connectionId, type: message.type, data: message.data });
        const connection = this.connections.get(connectionId);
        if (!connection) {
            console.error('WebSocket: Connection not found for', connectionId);
            return;
        }
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
            case 'joinQueue4Player':
                this.handleJoinQueue4Player(connectionId, message.data);
                break;
            case 'leaveQueue4Player':
                this.handleLeaveQueue4Player(connectionId, message.data);
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
        console.log('WebSocket: Handling authentication for connection', connectionId);
        const user = (0, auth_1.verifyToken)(data.token);
        if (!user) {
            console.error('WebSocket: Invalid token for connection', connectionId);
            this.sendToConnection(connectionId, 'authError', { message: 'Invalid token' });
            return;
        }
        console.log('WebSocket: User authenticated', { userId: user.id, username: user.username });
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.userId = user.id;
            this.userService.setUserOnline(user.id, connectionId);
            this.broadcastUserUpdate();
            this.sendToConnection(connectionId, 'authenticated', { user });
            console.log('WebSocket: Authentication successful for', user.username);
        }
    }
    handleGameInvite(connectionId, data) {
        console.log('WebSocket: Handling game invite', { connectionId, toUserId: data.toUserId });
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.userId) {
            console.error('WebSocket: Invalid connection for game invite', connectionId);
            return;
        }
        const fromUser = this.userService.getUserById(connection.userId);
        const toUser = this.userService.getUserById(data.toUserId);
        console.log('WebSocket: Game invite users', {
            fromUser: fromUser?.username,
            toUser: toUser?.username,
            toUserOnline: toUser?.isOnline,
            toUserInGame: toUser?.isInGame
        });
        if (!fromUser || !toUser || !toUser.isOnline || toUser.isInGame) {
            console.log('WebSocket: User not available for game invite');
            this.sendToConnection(connectionId, 'inviteError', { message: 'User not available' });
            return;
        }
        const invitation = this.gameService.createInvitation(fromUser.id, toUser.id);
        console.log('WebSocket: Created invitation', invitation.id);
        const toConnection = this.findConnectionByUserId(toUser.id);
        if (toConnection) {
            console.log('WebSocket: Sending invitation to target user');
            this.sendToConnection(toConnection, 'gameInvitation', {
                id: invitation.id,
                fromUser: { id: fromUser.id, username: fromUser.username }
            });
        }
        else {
            console.error('WebSocket: Target user connection not found');
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
                // Set all players in game
                game.playerIds.forEach(playerId => {
                    this.userService.setUserInGame(playerId, true);
                });
                // Send game start to all players
                game.playerIds.forEach((playerId, index) => {
                    const playerConnection = this.findConnectionByUserId(playerId);
                    if (playerConnection) {
                        this.sendToConnection(playerConnection, 'gameStart', { gameId: game.id });
                        const player = game.players[playerId];
                        this.sendToConnection(playerConnection, 'playerAssignment', {
                            playerId: playerId,
                            playerNumber: index + 1,
                            side: player.side
                        });
                    }
                });
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
    handleJoinGame(_connectionId, data) {
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
    handleJoinQueue4Player(connectionId, _data) {
        console.log('WebSocket: Handling join queue 4 player for connection', connectionId);
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.userId) {
            console.error('WebSocket: Invalid connection for join queue 4 player', connectionId);
            return;
        }
        const game = this.gameService.joinQueue4Player(connection.userId);
        if (game) {
            console.log('WebSocket: 4-player game created', game.id);
            // 4人のプレイヤー全員をゲームに参加させる
            game.playerIds.forEach((playerId, index) => {
                this.userService.setUserInGame(playerId, true);
                const playerConnection = this.findConnectionByUserId(playerId);
                if (playerConnection) {
                    this.sendToConnection(playerConnection, 'gameStart', { gameId: game.id });
                    this.sendToConnection(playerConnection, 'playerAssignment', {
                        playerId: playerId,
                        playerNumber: index + 1,
                        side: Object.values(game.players)[index].side
                    });
                }
            });
            this.gameService.startGame(game.id);
            this.startGameStateUpdates(game.id);
            this.broadcastUserUpdate();
        }
        else {
            // 待機中
            const waitingCount = this.gameService.getWaitingCount4Player();
            this.sendToConnection(connectionId, 'queueUpdate', {
                waiting: waitingCount,
                needed: 4 - waitingCount
            });
        }
    }
    handleLeaveQueue4Player(connectionId, _data) {
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.userId)
            return;
        this.gameService.leaveQueue4Player(connection.userId);
        this.sendToConnection(connectionId, 'leftQueue', {});
    }
    handleLeaveGame(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.userId)
            return;
        const game = this.gameService.getGame(data.gameId);
        if (game) {
            this.gameService.endGame(data.gameId);
            // 全プレイヤーをゲーム外に設定
            game.playerIds.forEach(playerId => {
                this.userService.setUserInGame(playerId, false);
            });
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
                    // Set all players as not in game
                    game.playerIds.forEach(playerId => {
                        this.userService.setUserInGame(playerId, false);
                    });
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
        // プレイヤー情報にユーザー名を追加
        const playersWithUsernames = {};
        Object.entries(game.players).forEach(([playerId, player]) => {
            const user = this.userService.getUserById(playerId);
            playersWithUsernames[playerId] = {
                ...player,
                username: user?.username || player.username
            };
        });
        const gameState = {
            gameType: game.gameType,
            players: playersWithUsernames,
            ball: {
                x: game.ballX,
                y: game.ballY,
                z: game.ballZ,
                velocityX: game.ballVelocityX,
                velocityY: game.ballVelocityY,
                velocityZ: game.ballVelocityZ
            },
            gameStatus: game.status,
            winner: game.winner,
            alivePlayers: game.alivePlayers
        };
        // 全プレイヤーにゲーム状態を送信
        game.playerIds.forEach(playerId => {
            const playerConnection = this.findConnectionByUserId(playerId);
            if (playerConnection) {
                this.sendToConnection(playerConnection, 'gameState', gameState);
            }
        });
    }
    sendGameEnd(gameId, winnerId) {
        const game = this.gameService.getGame(gameId);
        if (!game)
            return;
        const winner = this.userService.getUserById(winnerId);
        const endData = { winner: winner?.username || 'Unknown' };
        // 全プレイヤーにゲーム終了を通知
        game.playerIds.forEach(playerId => {
            const playerConnection = this.findConnectionByUserId(playerId);
            if (playerConnection) {
                this.sendToConnection(playerConnection, 'gameEnd', endData);
            }
        });
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