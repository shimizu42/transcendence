"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const ws_1 = require("ws");
const TournamentService_1 = require("./TournamentService");
const auth_1 = require("../middleware/auth");
class WebSocketService {
    constructor(userService, gameService, tankGameService) {
        this.connections = new Map();
        this.userService = userService;
        this.gameService = gameService;
        this.tankGameService = tankGameService;
        this.tournamentService = new TournamentService_1.TournamentService(gameService, tankGameService);
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
            // Tank game handlers
            case 'tankGameInvite':
                this.handleTankGameInvite(connectionId, message.data);
                break;
            case 'tankGameInviteResponse':
                this.handleTankGameInviteResponse(connectionId, message.data);
                break;
            case 'joinTankQueue4Player':
                this.handleJoinTankQueue4Player(connectionId, message.data);
                break;
            case 'leaveTankQueue4Player':
                this.handleLeaveTankQueue4Player(connectionId, message.data);
                break;
            case 'joinTankGame':
                this.handleJoinTankGame(connectionId, message.data);
                break;
            case 'tankControls':
                this.handleTankControls(connectionId, message.data);
                break;
            case 'restartTankGame':
                this.handleRestartTankGame(connectionId, message.data);
                break;
            case 'leaveTankGame':
                this.handleLeaveTankGame(connectionId, message.data);
                break;
            // Tournament handlers
            case 'joinTournament':
                this.handleJoinTournament(connectionId, message.data);
                break;
            case 'leaveTournament':
                this.handleLeaveTournament(connectionId, message.data);
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
    // Tank Game Handlers
    handleTankGameInvite(connectionId, data) {
        console.log('WebSocket: Handling tank game invite', { connectionId, toUserId: data.toUserId, gameType: data.gameType });
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.userId) {
            console.error('WebSocket: Invalid connection for tank game invite', connectionId);
            return;
        }
        const fromUser = this.userService.getUserById(connection.userId);
        const toUser = this.userService.getUserById(data.toUserId);
        console.log('WebSocket: Tank game invite users', {
            fromUser: fromUser?.username,
            toUser: toUser?.username,
            toUserOnline: toUser?.isOnline,
            toUserInGame: toUser?.isInGame
        });
        if (!fromUser || !toUser || !toUser.isOnline || toUser.isInGame) {
            console.log('WebSocket: User not available for tank game invite');
            this.sendToConnection(connectionId, 'tankInviteError', { message: 'User not available' });
            return;
        }
        const gameType = data.gameType || '2player';
        const invitation = this.tankGameService.createInvitation(fromUser.id, toUser.id, gameType);
        console.log('WebSocket: Created tank invitation', invitation.id);
        const toConnection = this.findConnectionByUserId(toUser.id);
        if (toConnection) {
            console.log('WebSocket: Sending tank invitation to target user');
            this.sendToConnection(toConnection, 'tankGameInvitation', {
                id: invitation.id,
                fromUser: { id: fromUser.id, username: fromUser.username },
                gameType: gameType
            });
        }
        else {
            console.error('WebSocket: Target user connection not found');
        }
    }
    handleTankGameInviteResponse(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.userId)
            return;
        const invitation = this.tankGameService.getInvitation(data.invitationId);
        if (!invitation || invitation.toUserId !== connection.userId)
            return;
        if (data.response === 'accept') {
            const game = this.tankGameService.acceptInvitation(data.invitationId);
            if (game) {
                // Set all players in game
                game.playerIds.forEach(playerId => {
                    this.userService.setUserInGame(playerId, true);
                });
                // Send game start to all players
                game.playerIds.forEach((playerId, index) => {
                    const playerConnection = this.findConnectionByUserId(playerId);
                    if (playerConnection) {
                        this.sendToConnection(playerConnection, 'tankGameStart', { gameId: game.id });
                        const player = game.players[playerId];
                        this.sendToConnection(playerConnection, 'tankPlayerAssignment', {
                            playerId: playerId,
                            playerNumber: index + 1,
                            side: player.side
                        });
                    }
                });
                this.tankGameService.startGame(game.id);
                this.startTankGameStateUpdates(game.id);
                this.broadcastUserUpdate();
            }
        }
        else {
            this.tankGameService.declineInvitation(data.invitationId);
            const fromConnection = this.findConnectionByUserId(invitation.fromUserId);
            if (fromConnection) {
                this.sendToConnection(fromConnection, 'tankInviteDeclined', {});
            }
        }
    }
    handleJoinTankQueue4Player(connectionId, _data) {
        console.log('WebSocket: Handling join tank queue 4 player for connection', connectionId);
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.userId) {
            console.error('WebSocket: Invalid connection for join tank queue 4 player', connectionId);
            return;
        }
        const game = this.tankGameService.joinQueue4Player(connection.userId);
        if (game) {
            console.log('WebSocket: 4-player tank game created', game.id);
            this.startTankGame(game);
        }
        else {
            const waitingCount = this.tankGameService.getWaitingCount4Player();
            this.sendToConnection(connectionId, 'tankQueueUpdate', {
                waiting: waitingCount,
                needed: 4 - waitingCount
            });
        }
    }
    handleLeaveTankQueue4Player(connectionId, _data) {
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.userId)
            return;
        this.tankGameService.leaveQueue4Player(connection.userId);
        this.sendToConnection(connectionId, 'leftTankQueue', {});
    }
    handleJoinTankGame(_connectionId, data) {
        const game = this.tankGameService.getGame(data.gameId);
        if (game) {
            this.sendTankGameState(data.gameId);
        }
    }
    handleTankControls(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.userId)
            return;
        this.tankGameService.handleTankControls(data.gameId, connection.userId, {
            moveForward: data.moveForward,
            turn: data.turn,
            turretTurn: data.turretTurn,
            shoot: data.shoot
        });
    }
    handleRestartTankGame(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.userId)
            return;
        const newGame = this.tankGameService.restartGame(data.gameId);
        if (newGame) {
            this.startTankGame(newGame);
        }
    }
    handleLeaveTankGame(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.userId)
            return;
        const game = this.tankGameService.getGame(data.gameId);
        if (game) {
            this.tankGameService.endGame(data.gameId);
            game.playerIds.forEach(playerId => {
                this.userService.setUserInGame(playerId, false);
            });
            this.broadcastUserUpdate();
        }
    }
    startTankGame(game) {
        game.playerIds.forEach((playerId, index) => {
            this.userService.setUserInGame(playerId, true);
            const playerConnection = this.findConnectionByUserId(playerId);
            if (playerConnection) {
                this.sendToConnection(playerConnection, 'tankGameStart', { gameId: game.id });
                const player = game.players[playerId];
                this.sendToConnection(playerConnection, 'tankPlayerAssignment', {
                    playerId: playerId,
                    playerNumber: index + 1,
                    side: player.side
                });
            }
        });
        this.tankGameService.startGame(game.id);
        this.startTankGameStateUpdates(game.id);
        this.broadcastUserUpdate();
    }
    startTankGameStateUpdates(gameId) {
        const interval = setInterval(() => {
            const game = this.tankGameService.getGame(gameId);
            if (!game || game.status === 'finished') {
                clearInterval(interval);
                if (game && game.status === 'finished') {
                    this.sendTankGameEnd(gameId, game.winner);
                    game.playerIds.forEach(playerId => {
                        this.userService.setUserInGame(playerId, false);
                    });
                    this.broadcastUserUpdate();
                }
                return;
            }
            this.sendTankGameState(gameId);
        }, 16);
    }
    sendTankGameState(gameId) {
        const game = this.tankGameService.getGame(gameId);
        if (!game)
            return;
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
            bullets: game.bullets,
            gameStatus: game.status,
            winner: game.winner,
            alivePlayers: game.alivePlayers
        };
        game.playerIds.forEach(playerId => {
            const playerConnection = this.findConnectionByUserId(playerId);
            if (playerConnection) {
                this.sendToConnection(playerConnection, 'tankGameState', gameState);
            }
        });
    }
    sendTankGameEnd(gameId, winnerId) {
        const game = this.tankGameService.getGame(gameId);
        if (!game)
            return;
        const winner = this.userService.getUserById(winnerId);
        const endData = { winner: winner?.username || 'Unknown' };
        game.playerIds.forEach(playerId => {
            const playerConnection = this.findConnectionByUserId(playerId);
            if (playerConnection) {
                this.sendToConnection(playerConnection, 'tankGameEnd', endData);
            }
        });
    }
    // Tournament Handlers
    handleJoinTournament(connectionId, data) {
        console.log('WebSocket: Handling join tournament for connection', connectionId);
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.userId) {
            console.error('WebSocket: Invalid connection for join tournament', connectionId);
            return;
        }
        const gameType = data.gameType || 'pong';
        const result = this.tournamentService.joinTournamentQueue(connection.userId, gameType);
        if (result.tournament) {
            console.log('WebSocket: Tournament created', result.tournament.id);
            // トーナメント開始時に全プレイヤーに状態を送信
            result.tournament.playerIds.forEach(playerId => {
                const playerConnection = this.findConnectionByUserId(playerId);
                if (playerConnection) {
                    this.sendToConnection(playerConnection, 'tournamentStart', result.tournament);
                }
            });
            // 自動的に最初の試合を開始
            setTimeout(() => {
                this.startNextTournamentMatch(result.tournament.id);
            }, 2000); // 2秒待ってから開始
        }
        else {
            // 待機中の状態を送信
            this.sendToConnection(connectionId, 'tournamentQueue', { position: result.position });
        }
    }
    handleLeaveTournament(connectionId, _data) {
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.userId)
            return;
        this.tournamentService.leaveTournamentQueue(connection.userId);
        this.sendToConnection(connectionId, 'tournamentLeft', {});
    }
    startNextTournamentMatch(tournamentId) {
        const tournament = this.tournamentService.getTournament(tournamentId);
        if (!tournament)
            return;
        const nextMatch = this.tournamentService.getNextMatch(tournamentId);
        if (nextMatch && nextMatch.player1Id && nextMatch.player2Id) {
            console.log('WebSocket: Starting tournament match', nextMatch.id);
            // ゲームを作成（2人用）
            const gameId = this.tournamentService.startMatch(tournamentId, nextMatch.id);
            if (gameId) {
                const tournament = this.tournamentService.getTournament(tournamentId);
                const game = tournament?.gameType === 'tank'
                    ? this.tankGameService.getGame(gameId)
                    : this.gameService.getGame(gameId);
                if (!game)
                    return;
                // プレイヤーをゲーム中に設定
                game.playerIds.forEach((playerId) => {
                    this.userService.setUserInGame(playerId, true);
                });
                // プレイヤーに試合開始を通知（ゲームタイプに応じて）
                const tournamentData = this.tournamentService.getTournament(tournamentId);
                game.playerIds.forEach((playerId, index) => {
                    const playerConnection = this.findConnectionByUserId(playerId);
                    if (playerConnection) {
                        if (tournamentData?.gameType === 'tank') {
                            this.sendToConnection(playerConnection, 'tankGameStart', {
                                gameId: gameId
                            });
                        }
                        else {
                            this.sendToConnection(playerConnection, 'gameStart', {
                                gameId: gameId
                            });
                        }
                        // プレイヤー割り当て
                        const player = game.players[playerId];
                        if (tournamentData?.gameType === 'tank') {
                            this.sendToConnection(playerConnection, 'tankPlayerAssignment', {
                                playerId: playerId,
                                playerNumber: index + 1,
                                side: player.side
                            });
                        }
                        else {
                            this.sendToConnection(playerConnection, 'playerAssignment', {
                                playerId: playerId,
                                playerNumber: index + 1,
                                side: player.side
                            });
                        }
                    }
                });
                // ゲーム状態更新開始
                this.startTournamentGameStateUpdates(gameId, tournamentId, nextMatch.id);
                this.broadcastUserUpdate();
                // トーナメント状態を更新
                const updatedTournament = this.tournamentService.getTournament(tournamentId);
                if (updatedTournament) {
                    updatedTournament.playerIds.forEach(playerId => {
                        const playerConnection = this.findConnectionByUserId(playerId);
                        if (playerConnection) {
                            this.sendToConnection(playerConnection, 'tournamentUpdate', updatedTournament);
                        }
                    });
                }
            }
        }
    }
    startTournamentGameStateUpdates(gameId, tournamentId, matchId) {
        const interval = setInterval(() => {
            const tournament = this.tournamentService.getTournament(tournamentId);
            const game = tournament?.gameType === 'tank'
                ? this.tankGameService.getGame(gameId)
                : this.gameService.getGame(gameId);
            if (!game || game.status === 'finished') {
                clearInterval(interval);
                if (game && game.status === 'finished') {
                    // 試合完了処理
                    this.tournamentService.finishMatch(tournamentId, matchId, game.winner);
                    // プレイヤーをゲーム外に設定
                    game.playerIds.forEach((playerId) => {
                        this.userService.setUserInGame(playerId, false);
                    });
                    const tournament = this.tournamentService.getTournament(tournamentId);
                    if (tournament) {
                        // トーナメント状態を全プレイヤーに送信
                        tournament.playerIds.forEach(playerId => {
                            const playerConnection = this.findConnectionByUserId(playerId);
                            if (playerConnection) {
                                this.sendToConnection(playerConnection, 'tournamentUpdate', tournament);
                            }
                        });
                        if (tournament.status === 'finished') {
                            // トーナメント完了
                            tournament.playerIds.forEach(playerId => {
                                const playerConnection = this.findConnectionByUserId(playerId);
                                if (playerConnection) {
                                    this.sendToConnection(playerConnection, 'tournamentCompleted', {
                                        winnerId: tournament.winnerId
                                    });
                                }
                            });
                        }
                        else {
                            // 次の試合を自動開始
                            setTimeout(() => {
                                this.startNextTournamentMatch(tournamentId);
                            }, 3000); // 3秒待機してから次の試合
                        }
                    }
                    this.broadcastUserUpdate();
                }
                return;
            }
            if (tournament?.gameType === 'tank') {
                this.sendTankGameState(gameId);
            }
            else {
                this.sendGameState(gameId);
            }
        }, 16);
    }
    generateConnectionId() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
}
exports.WebSocketService = WebSocketService;
//# sourceMappingURL=WebSocketService.js.map