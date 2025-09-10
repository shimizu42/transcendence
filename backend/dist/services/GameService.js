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
        const game = this.createGame(invitation.fromUserId, invitation.toUserId);
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
    createGame(player1Id, player2Id) {
        const game = {
            id: crypto_1.default.randomUUID(),
            player1Id,
            player2Id,
            player1Score: 0,
            player2Score: 0,
            player1PaddleY: 0,
            player2PaddleY: 0,
            ballX: 0,
            ballY: 0.25,
            ballZ: 0,
            ballVelocityX: 0.1,
            ballVelocityY: 0,
            ballVelocityZ: 0.05,
            status: 'waiting',
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
        const paddleSpeed = 0.2;
        const maxPaddleY = 4;
        if (playerId === game.player1Id) {
            game.player1PaddleY = Math.max(-maxPaddleY, Math.min(maxPaddleY, game.player1PaddleY + (direction * paddleSpeed)));
        }
        else if (playerId === game.player2Id) {
            game.player2PaddleY = Math.max(-maxPaddleY, Math.min(maxPaddleY, game.player2PaddleY + (direction * paddleSpeed)));
        }
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
            this.checkCollisions(game);
            this.checkScore(game);
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
        if (game.ballX <= -8.5 && game.ballX >= -9.5) {
            if (Math.abs(game.ballZ - game.player1PaddleY) <= paddleHeight / 2) {
                game.ballVelocityX *= -1;
                game.ballVelocityZ += (game.ballZ - game.player1PaddleY) * 0.1;
            }
        }
        if (game.ballX >= 8.5 && game.ballX <= 9.5) {
            if (Math.abs(game.ballZ - game.player2PaddleY) <= paddleHeight / 2) {
                game.ballVelocityX *= -1;
                game.ballVelocityZ += (game.ballZ - game.player2PaddleY) * 0.1;
            }
        }
    }
    checkScore(game) {
        if (game.ballX < -10) {
            game.player2Score++;
            this.resetBall(game);
        }
        else if (game.ballX > 10) {
            game.player1Score++;
            this.resetBall(game);
        }
        if (game.player1Score >= 5 || game.player2Score >= 5) {
            const winner = game.player1Score >= 5 ? game.player1Id : game.player2Id;
            this.endGame(game.id, winner);
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
    removeGame(gameId) {
        const interval = this.gameIntervals.get(gameId);
        if (interval) {
            clearInterval(interval);
            this.gameIntervals.delete(gameId);
        }
        this.games.delete(gameId);
    }
}
exports.GameService = GameService;
//# sourceMappingURL=GameService.js.map