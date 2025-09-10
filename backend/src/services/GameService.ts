import { Game, GameInvitation } from '../models/User';
import crypto from 'crypto';

export class GameService {
  private games: Map<string, Game> = new Map();
  private invitations: Map<string, GameInvitation> = new Map();
  private gameIntervals: Map<string, NodeJS.Timeout> = new Map();

  createInvitation(fromUserId: string, toUserId: string): GameInvitation {
    const invitation: GameInvitation = {
      id: crypto.randomUUID(),
      fromUserId,
      toUserId,
      status: 'pending',
      createdAt: new Date()
    };

    this.invitations.set(invitation.id, invitation);
    return invitation;
  }

  getInvitation(id: string): GameInvitation | undefined {
    return this.invitations.get(id);
  }

  acceptInvitation(id: string): Game | null {
    const invitation = this.invitations.get(id);
    if (!invitation || invitation.status !== 'pending') {
      return null;
    }

    invitation.status = 'accepted';
    const game = this.createGame(invitation.fromUserId, invitation.toUserId);
    this.invitations.delete(id);
    return game;
  }

  declineInvitation(id: string): boolean {
    const invitation = this.invitations.get(id);
    if (!invitation || invitation.status !== 'pending') {
      return false;
    }

    invitation.status = 'declined';
    this.invitations.delete(id);
    return true;
  }

  createGame(player1Id: string, player2Id: string): Game {
    const game: Game = {
      id: crypto.randomUUID(),
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

  getGame(id: string): Game | undefined {
    return this.games.get(id);
  }

  startGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'waiting') {
      return false;
    }

    game.status = 'playing';
    this.startGameLoop(gameId);
    return true;
  }

  updatePaddle(gameId: string, playerId: string, direction: number): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'playing') {
      return false;
    }

    const paddleSpeed = 0.2;
    const maxPaddleY = 4;
    
    if (playerId === game.player1Id) {
      game.player1PaddleY = Math.max(-maxPaddleY, Math.min(maxPaddleY, game.player1PaddleY + (direction * paddleSpeed)));
    } else if (playerId === game.player2Id) {
      game.player2PaddleY = Math.max(-maxPaddleY, Math.min(maxPaddleY, game.player2PaddleY + (direction * paddleSpeed)));
    }

    return true;
  }

  endGame(gameId: string, winner?: string): boolean {
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

  private startGameLoop(gameId: string): void {
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

  private updateBall(game: Game): void {
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

  private checkCollisions(game: Game): void {
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

  private checkScore(game: Game): void {
    if (game.ballX < -10) {
      game.player2Score++;
      this.resetBall(game);
    } else if (game.ballX > 10) {
      game.player1Score++;
      this.resetBall(game);
    }

    if (game.player1Score >= 5 || game.player2Score >= 5) {
      const winner = game.player1Score >= 5 ? game.player1Id : game.player2Id;
      this.endGame(game.id, winner);
    }
  }

  private resetBall(game: Game): void {
    game.ballX = 0;
    game.ballY = 0.25;
    game.ballZ = 0;
    game.ballVelocityX = Math.random() > 0.5 ? 0.1 : -0.1;
    game.ballVelocityY = 0;
    game.ballVelocityZ = (Math.random() - 0.5) * 0.1;
  }

  removeGame(gameId: string): void {
    const interval = this.gameIntervals.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.gameIntervals.delete(gameId);
    }
    this.games.delete(gameId);
  }
}