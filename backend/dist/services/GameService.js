"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class GameService {
    constructor() {
        this.games = new Map();
        this.invitations = new Map();
        this.gameIntervals = new Map();
        this.waitingRoom4Player = []; // 4人対戦待機中のプレイヤーID
    }
    createInvitation(fromUserId, toUserId) {
        const invitation = {
            id: crypto_1.default.randomUUID(),
            fromUserId,
            toUserId,
            status: 'pending',
            createdAt: new Date()
        };
        this.invitations.set(invitation.id, invitation);
        return invitation;
    }
    getInvitation(id) {
        return this.invitations.get(id);
    }
    acceptInvitation(id) {
        const invitation = this.invitations.get(id);
        if (!invitation || invitation.status !== 'pending') {
            return null;
        }
        invitation.status = 'accepted';
        const game = this.createGame([invitation.fromUserId, invitation.toUserId], '2player');
        this.invitations.delete(id);
        return game;
    }
    declineInvitation(id) {
        const invitation = this.invitations.get(id);
        if (!invitation || invitation.status !== 'pending') {
            return false;
        }
        invitation.status = 'declined';
        this.invitations.delete(id);
        return true;
    }
    createGame(playerIds, gameType = '2player') {
        const gameId = crypto_1.default.randomUUID();
        const sides = gameType === '4player'
            ? ['left', 'top', 'right', 'bottom']
            : ['left', 'right'];
        const players = {};
        const maxLives = gameType === '4player' ? 3 : 5; // 4人戦は3ライフ、2人戦は5ポイント制
        playerIds.forEach((playerId, index) => {
            players[playerId] = {
                id: playerId,
                username: `Player${index + 1}`, // これは後でUserServiceから取得
                score: 0,
                lives: maxLives,
                paddlePosition: 0,
                isAlive: true,
                side: sides[index]
            };
        });
        const game = {
            id: gameId,
            gameType,
            players,
            playerIds,
            maxPlayers: gameType === '4player' ? 4 : 2,
            ballX: 0,
            ballY: 0.25,
            ballZ: 0,
            ballVelocityX: Math.random() > 0.5 ? 0.1 : -0.1,
            ballVelocityY: 0,
            ballVelocityZ: (Math.random() - 0.5) * 0.1,
            status: 'waiting',
            alivePlayers: [...playerIds],
            createdAt: new Date()
        };
        this.games.set(game.id, game);
        return game;
    }
    getGame(id) {
        return this.games.get(id);
    }
    startGame(gameId) {
        const game = this.games.get(gameId);
        if (!game || game.status !== 'waiting') {
            return false;
        }
        game.status = 'playing';
        this.startGameLoop(gameId);
        return true;
    }
    updatePaddle(gameId, playerId, direction) {
        const game = this.games.get(gameId);
        if (!game || game.status !== 'playing') {
            return false;
        }
        const player = game.players[playerId];
        if (!player || !player.isAlive) {
            return false;
        }
        const paddleSpeed = 0.2;
        const maxPosition = 4;
        player.paddlePosition = Math.max(-maxPosition, Math.min(maxPosition, player.paddlePosition + (direction * paddleSpeed)));
        return true;
    }
    endGame(gameId, winner) {
        const game = this.games.get(gameId);
        if (!game) {
            return false;
        }
        game.status = 'finished';
        game.winner = winner;
        const interval = this.gameIntervals.get(gameId);
        if (interval) {
            clearInterval(interval);
            this.gameIntervals.delete(gameId);
        }
        return true;
    }
    startGameLoop(gameId) {
        const interval = setInterval(() => {
            const game = this.games.get(gameId);
            if (!game || game.status !== 'playing') {
                clearInterval(interval);
                this.gameIntervals.delete(gameId);
                return;
            }
            this.updateBall(game);
            if (game.gameType === '4player') {
                this.checkCollisions4Player(game);
                this.checkBounds4Player(game);
            }
            else {
                this.checkCollisions(game);
                this.checkScore(game);
            }
        }, 16);
        this.gameIntervals.set(gameId, interval);
    }
    updateBall(game) {
        game.ballX += game.ballVelocityX;
        game.ballY += game.ballVelocityY;
        game.ballZ += game.ballVelocityZ;
        if (game.ballZ >= 4.5 || game.ballZ <= -4.5) {
            game.ballVelocityZ *= -1;
        }
        if (game.ballY <= 0.25 || game.ballY >= 2) {
            game.ballVelocityY *= -1;
        }
    }
    checkCollisions(game) {
        const ballRadius = 0.25;
        const paddleWidth = 0.2;
        const paddleHeight = 2;
        const players = Object.values(game.players);
        const leftPlayer = players.find(p => p.side === 'left');
        const rightPlayer = players.find(p => p.side === 'right');
        if (game.ballX <= -8.5 && game.ballX >= -9.5 && leftPlayer) {
            if (Math.abs(game.ballZ - leftPlayer.paddlePosition) <= paddleHeight / 2) {
                game.ballVelocityX *= -1;
                game.ballVelocityZ += (game.ballZ - leftPlayer.paddlePosition) * 0.1;
            }
        }
        if (game.ballX >= 8.5 && game.ballX <= 9.5 && rightPlayer) {
            if (Math.abs(game.ballZ - rightPlayer.paddlePosition) <= paddleHeight / 2) {
                game.ballVelocityX *= -1;
                game.ballVelocityZ += (game.ballZ - rightPlayer.paddlePosition) * 0.1;
            }
        }
    }
    checkScore(game) {
        const players = Object.values(game.players);
        const leftPlayer = players.find(p => p.side === 'left');
        const rightPlayer = players.find(p => p.side === 'right');
        if (game.ballX < -10 && rightPlayer) {
            rightPlayer.score++;
            this.resetBall(game);
        }
        else if (game.ballX > 10 && leftPlayer) {
            leftPlayer.score++;
            this.resetBall(game);
        }
        const maxScore = 5;
        const winner = players.find(p => p.score >= maxScore);
        if (winner) {
            this.endGame(game.id, winner.id);
        }
    }
    resetBall(game) {
        game.ballX = 0;
        game.ballY = 0.25;
        game.ballZ = 0;
        game.ballVelocityX = Math.random() > 0.5 ? 0.1 : -0.1;
        game.ballVelocityY = 0;
        game.ballVelocityZ = (Math.random() - 0.5) * 0.1;
    }
    // 4人対戦用の衝突検知
    checkCollisions4Player(game) {
        const fieldSize = 10;
        const paddleSize = 2;
        // 各辺での衝突をチェック
        Object.values(game.players).forEach(player => {
            if (!player.isAlive)
                return;
            switch (player.side) {
                case 'left':
                    if (game.ballX <= -fieldSize / 2 + 0.5 && game.ballX >= -fieldSize / 2 - 0.5) {
                        if (Math.abs(game.ballZ - player.paddlePosition) <= paddleSize / 2) {
                            game.ballVelocityX = Math.abs(game.ballVelocityX);
                            game.ballVelocityZ += (game.ballZ - player.paddlePosition) * 0.1;
                        }
                    }
                    break;
                case 'right':
                    if (game.ballX >= fieldSize / 2 - 0.5 && game.ballX <= fieldSize / 2 + 0.5) {
                        if (Math.abs(game.ballZ - player.paddlePosition) <= paddleSize / 2) {
                            game.ballVelocityX = -Math.abs(game.ballVelocityX);
                            game.ballVelocityZ += (game.ballZ - player.paddlePosition) * 0.1;
                        }
                    }
                    break;
                case 'top':
                    if (game.ballZ >= fieldSize / 2 - 0.5 && game.ballZ <= fieldSize / 2 + 0.5) {
                        if (Math.abs(game.ballX - player.paddlePosition) <= paddleSize / 2) {
                            game.ballVelocityZ = -Math.abs(game.ballVelocityZ);
                            game.ballVelocityX += (game.ballX - player.paddlePosition) * 0.1;
                        }
                    }
                    break;
                case 'bottom':
                    if (game.ballZ <= -fieldSize / 2 + 0.5 && game.ballZ >= -fieldSize / 2 - 0.5) {
                        if (Math.abs(game.ballX - player.paddlePosition) <= paddleSize / 2) {
                            game.ballVelocityZ = Math.abs(game.ballVelocityZ);
                            game.ballVelocityX += (game.ballX - player.paddlePosition) * 0.1;
                        }
                    }
                    break;
            }
            // 速度制限
            const maxSpeed = 0.3;
            game.ballVelocityX = Math.max(-maxSpeed, Math.min(maxSpeed, game.ballVelocityX));
            game.ballVelocityZ = Math.max(-maxSpeed, Math.min(maxSpeed, game.ballVelocityZ));
        });
    }
    // 4人対戦用の境界チェック
    checkBounds4Player(game) {
        const fieldSize = 10;
        // ボールが境界を越えた場合、該当するプレイヤーのライフを減らす
        if (game.ballX < -fieldSize / 2) {
            this.playerLoseLife(game, 'left');
        }
        else if (game.ballX > fieldSize / 2) {
            this.playerLoseLife(game, 'right');
        }
        else if (game.ballZ > fieldSize / 2) {
            this.playerLoseLife(game, 'top');
        }
        else if (game.ballZ < -fieldSize / 2) {
            this.playerLoseLife(game, 'bottom');
        }
    }
    playerLoseLife(game, side) {
        const player = Object.values(game.players).find(p => p.side === side);
        if (!player || !player.isAlive)
            return;
        player.lives--;
        if (player.lives <= 0) {
            player.isAlive = false;
            game.alivePlayers = game.alivePlayers.filter(id => id !== player.id);
            // 最後の1人になったらゲーム終了
            if (game.alivePlayers.length <= 1) {
                const winner = game.alivePlayers[0];
                this.endGame(game.id, winner);
                return;
            }
        }
        this.resetBall(game);
    }
    removeGame(gameId) {
        const interval = this.gameIntervals.get(gameId);
        if (interval) {
            clearInterval(interval);
            this.gameIntervals.delete(gameId);
        }
        this.games.delete(gameId);
    }
    // 4人対戦のマッチメイキング
    joinQueue4Player(playerId) {
        if (this.waitingRoom4Player.includes(playerId)) {
            return null; // 既に待機中
        }
        this.waitingRoom4Player.push(playerId);
        // 4人揃ったらゲーム開始
        if (this.waitingRoom4Player.length >= 4) {
            const players = this.waitingRoom4Player.splice(0, 4);
            return this.createGame(players, '4player');
        }
        return null;
    }
    leaveQueue4Player(playerId) {
        this.waitingRoom4Player = this.waitingRoom4Player.filter(id => id !== playerId);
    }
    getWaitingCount4Player() {
        return this.waitingRoom4Player.length;
    }
}
exports.GameService = GameService;
//# sourceMappingURL=GameService.js.map