import { Game, GameInvitation, GamePlayer } from '../models/User';
import crypto from 'crypto';

export class GameService {
  private games: Map<string, Game> = new Map();
  private invitations: Map<string, GameInvitation> = new Map();
  private gameIntervals: Map<string, NodeJS.Timeout> = new Map();
  private waitingRoom4Player: string[] = []; // 4人対戦待機中のプレイヤーID

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
    const game = this.createGame([invitation.fromUserId, invitation.toUserId], '2player');
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

  createGame(playerIds: string[], gameType: '2player' | '4player' = '2player'): Game {
    const gameId = crypto.randomUUID();
    const sides = gameType === '4player' 
      ? ['left', 'top', 'right', 'bottom'] as const
      : ['left', 'right'] as const;
    
    const players: { [key: string]: GamePlayer } = {};
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

    const game: Game = {
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

    const player = game.players[playerId];
    if (!player || !player.isAlive) {
      return false;
    }

    const paddleSpeed = 0.2;
    // Increase paddle movement range to match field size
    const maxPosition = game.gameType === '4player' ? 8 : 4;
    
    player.paddlePosition = Math.max(-maxPosition, Math.min(maxPosition, player.paddlePosition + (direction * paddleSpeed)));
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
      if (game.gameType === '4player') {
        this.checkCollisions4Player(game);
        this.checkBounds4Player(game);
      } else {
        this.checkCollisions(game);
        this.checkScore(game);
      }
    }, 16);

    this.gameIntervals.set(gameId, interval);
  }

  private updateBall(game: Game): void {
    game.ballX += game.ballVelocityX;
    game.ballY += game.ballVelocityY;
    game.ballZ += game.ballVelocityZ;

    // Y軸の境界チェック（上下の反射）
    if (game.ballY <= 0.25 || game.ballY >= 2) {
      game.ballVelocityY *= -1;
    }
    
    // 2人対戦の場合のみZ軸の壁での反射
    if (game.gameType === '2player') {
      if (game.ballZ >= 4.5 || game.ballZ <= -4.5) {
        game.ballVelocityZ *= -1;
      }
    }
  }

  private checkCollisions(game: Game): void {
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

  private checkScore(game: Game): void {
    const players = Object.values(game.players);
    const leftPlayer = players.find(p => p.side === 'left');
    const rightPlayer = players.find(p => p.side === 'right');

    if (game.ballX < -10 && rightPlayer) {
      rightPlayer.score++;
      this.resetBall(game);
    } else if (game.ballX > 10 && leftPlayer) {
      leftPlayer.score++;
      this.resetBall(game);
    }

    const maxScore = 5;
    const winner = players.find(p => p.score >= maxScore);
    if (winner) {
      this.endGame(game.id, winner.id);
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

  // 4人対戦用の衝突検知（生きているプレイヤーのパドルと死んでいるプレイヤーの仕切り）
  private checkCollisions4Player(game: Game): void {
    const fieldSize = 20;
    const paddleSize = 2;
    // パドルはフィールド端から0.5内側に配置されているので、その位置で衝突判定
    const paddleDistance = 0.5; // フィールド端からパドルまでの距離
    
    // 重複した衝突を防ぐためのフラグ
    let collisionOccurred = false;

    // 各辺での衝突をチェック
    Object.values(game.players).forEach(player => {
      if (collisionOccurred) return; // 既に衝突が起きた場合はスキップ
      
      switch (player.side) {
        case 'left':
          // パドルは-9.5の位置にあるので、ボールがその位置で衝突判定
          if (game.ballX <= -(fieldSize/2 - paddleDistance) && game.ballVelocityX < 0) {
            if (player.isAlive) {
              // 生きているプレイヤー：パドルとの衝突判定のみ
              if (Math.abs(game.ballZ - player.paddlePosition) <= paddleSize / 2) {
                game.ballVelocityX = Math.abs(game.ballVelocityX);
                game.ballVelocityZ += (game.ballZ - player.paddlePosition) * 0.1;
                collisionOccurred = true;
              }
            } else {
              // 死んでいるプレイヤー：仕切りでの反射はフィールド端で判定
              if (game.ballX <= -fieldSize/2) {
                game.ballVelocityX = Math.abs(game.ballVelocityX);
                collisionOccurred = true;
              }
            }
          }
          break;
        case 'right':
          if (game.ballX >= (fieldSize/2 - paddleDistance) && game.ballVelocityX > 0) {
            if (player.isAlive) {
              if (Math.abs(game.ballZ - player.paddlePosition) <= paddleSize / 2) {
                game.ballVelocityX = -Math.abs(game.ballVelocityX);
                game.ballVelocityZ += (game.ballZ - player.paddlePosition) * 0.1;
                collisionOccurred = true;
              }
            } else {
              if (game.ballX >= fieldSize/2) {
                game.ballVelocityX = -Math.abs(game.ballVelocityX);
                collisionOccurred = true;
              }
            }
          }
          break;
        case 'top':
          if (game.ballZ >= (fieldSize/2 - paddleDistance) && game.ballVelocityZ > 0) {
            if (player.isAlive) {
              if (Math.abs(game.ballX - player.paddlePosition) <= paddleSize / 2) {
                game.ballVelocityZ = -Math.abs(game.ballVelocityZ);
                game.ballVelocityX += (game.ballX - player.paddlePosition) * 0.1;
                collisionOccurred = true;
              }
            } else {
              if (game.ballZ >= fieldSize/2) {
                game.ballVelocityZ = -Math.abs(game.ballVelocityZ);
                collisionOccurred = true;
              }
            }
          }
          break;
        case 'bottom':
          if (game.ballZ <= -(fieldSize/2 - paddleDistance) && game.ballVelocityZ < 0) {
            if (player.isAlive) {
              if (Math.abs(game.ballX - player.paddlePosition) <= paddleSize / 2) {
                game.ballVelocityZ = Math.abs(game.ballVelocityZ);
                game.ballVelocityX += (game.ballX - player.paddlePosition) * 0.1;
                collisionOccurred = true;
              }
            } else {
              if (game.ballZ <= -fieldSize/2) {
                game.ballVelocityZ = Math.abs(game.ballVelocityZ);
                collisionOccurred = true;
              }
            }
          }
          break;
      }
    });

    // 速度制限
    const maxSpeed = 0.3;
    game.ballVelocityX = Math.max(-maxSpeed, Math.min(maxSpeed, game.ballVelocityX));
    game.ballVelocityZ = Math.max(-maxSpeed, Math.min(maxSpeed, game.ballVelocityZ));
  }

  // 4人対戦用の境界チェック（生きているプレイヤーのみライフを失う）
  private checkBounds4Player(game: Game): void {
    const fieldSize = 20;
    const boundary = fieldSize / 2 + 0.3; // ボールが端を越えた時に判定（少し余裕を持たせる）
    
    // ボールが境界を越えた場合、該当するプレイヤーがまだ生きていればライフを減らす
    if (game.ballX < -boundary) {
      const leftPlayer = Object.values(game.players).find(p => p.side === 'left');
      if (leftPlayer && leftPlayer.isAlive) {
        this.playerLoseLife(game, 'left');
      }
    } else if (game.ballX > boundary) {
      const rightPlayer = Object.values(game.players).find(p => p.side === 'right');
      if (rightPlayer && rightPlayer.isAlive) {
        this.playerLoseLife(game, 'right');
      }
    } else if (game.ballZ > boundary) {
      const topPlayer = Object.values(game.players).find(p => p.side === 'top');
      if (topPlayer && topPlayer.isAlive) {
        this.playerLoseLife(game, 'top');
      }
    } else if (game.ballZ < -boundary) {
      const bottomPlayer = Object.values(game.players).find(p => p.side === 'bottom');
      if (bottomPlayer && bottomPlayer.isAlive) {
        this.playerLoseLife(game, 'bottom');
      }
    }
  }

  private playerLoseLife(game: Game, side: 'top' | 'bottom' | 'left' | 'right'): void {
    const player = Object.values(game.players).find(p => p.side === side);
    if (!player || !player.isAlive) return;

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

  removeGame(gameId: string): void {
    const interval = this.gameIntervals.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.gameIntervals.delete(gameId);
    }
    this.games.delete(gameId);
  }

  // 4人対戦のマッチメイキング
  joinQueue4Player(playerId: string): Game | null {
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

  leaveQueue4Player(playerId: string): void {
    this.waitingRoom4Player = this.waitingRoom4Player.filter(id => id !== playerId);
  }

  getWaitingCount4Player(): number {
    return this.waitingRoom4Player.length;
  }
}