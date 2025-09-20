import crypto from 'crypto';

export interface TankPlayer {
  id: string;
  username: string;
  lives: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: number;
  turretRotation: number;
  isAlive: boolean;
  side?: 'top' | 'bottom' | 'left' | 'right';
  lastShot: number; // 最後に撃った時刻（クールダウン用）
}

export interface Bullet {
  id: string;
  playerId: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  direction: {
    x: number;
    y: number;
    z: number;
  };
  speed: number;
  isActive: boolean;
  createdAt: number;
}

export interface TankGame {
  id: string;
  gameType: '2player' | '4player';
  players: { [key: string]: TankPlayer };
  bullets: { [key: string]: Bullet };
  status: 'waiting' | 'playing' | 'finished';
  winner?: string;
  alivePlayers: string[];
  createdAt: Date;
  maxPlayers: number;
  playerIds: string[];
}

export interface TankControls {
  moveForward: number;
  turn: number;
  turretTurn: number;
  shoot: boolean;
}

export interface TankGameInvitation {
  id: string;
  fromUserId: string;
  toUserId: string;
  gameType: '2player' | '4player';
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

export class TankGameService {
  private games: Map<string, TankGame> = new Map();
  private gameIntervals: Map<string, NodeJS.Timeout> = new Map();
  private invitations: Map<string, TankGameInvitation> = new Map();
  private waitingRoom4Player: string[] = [];

  private readonly TANK_SPEED = 0.1;
  private readonly TURN_SPEED = 0.05;
  private readonly TURRET_TURN_SPEED = 0.08;
  private readonly BULLET_SPEED = 0.3;
  private readonly BULLET_LIFETIME = 5000; // 5秒
  private readonly SHOT_COOLDOWN = 500; // 0.5秒
  private readonly INITIAL_LIVES = 3;

  createGame(playerIds: string[], gameType: '2player' | '4player' = '2player'): TankGame {
    const gameId = crypto.randomUUID();
    const fieldSize = gameType === '4player' ? 30 : 30;
    const fieldDepth = gameType === '4player' ? 30 : 20;

    const players: { [key: string]: TankPlayer } = {};
    const sides = gameType === '4player'
      ? ['top', 'bottom', 'left', 'right'] as const
      : ['left', 'right'] as const;

    // プレイヤーの初期配置
    playerIds.forEach((playerId, index) => {
      let position: { x: number; y: number; z: number };
      let rotation = 0;

      if (gameType === '4player') {
        switch (sides[index]) {
          case 'top':
            position = { x: 0, y: 0, z: fieldSize / 2 - 3 };
            rotation = Math.PI;
            break;
          case 'bottom':
            position = { x: 0, y: 0, z: -fieldSize / 2 + 3 };
            rotation = 0;
            break;
          case 'left':
            position = { x: -fieldSize / 2 + 3, y: 0, z: 0 };
            rotation = Math.PI / 2;
            break;
          case 'right':
            position = { x: fieldSize / 2 - 3, y: 0, z: 0 };
            rotation = -Math.PI / 2;
            break;
          default:
            position = { x: 0, y: 0, z: 0 };
        }
      } else {
        // 2人対戦
        if (index === 0) {
          position = { x: -fieldDepth / 2 + 3, y: 0, z: 0 };
          rotation = Math.PI / 2;
        } else {
          position = { x: fieldDepth / 2 - 3, y: 0, z: 0 };
          rotation = -Math.PI / 2;
        }
      }

      players[playerId] = {
        id: playerId,
        username: `Tank${index + 1}`, // 後でUserServiceから取得
        lives: this.INITIAL_LIVES,
        position,
        rotation,
        turretRotation: rotation,
        isAlive: true,
        side: sides[index],
        lastShot: 0
      };
    });

    const game: TankGame = {
      id: gameId,
      gameType,
      players,
      bullets: {},
      status: 'waiting',
      alivePlayers: [...playerIds],
      createdAt: new Date(),
      maxPlayers: gameType === '4player' ? 4 : 2,
      playerIds
    };

    this.games.set(game.id, game);
    return game;
  }

  getGame(id: string): TankGame | undefined {
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

  handleTankControls(gameId: string, playerId: string, controls: TankControls): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'playing') {
      return false;
    }

    const player = game.players[playerId];
    if (!player || !player.isAlive) {
      return false;
    }

    const now = Date.now();

    // タンクの移動（Babylon.jsの座標系に合わせる）
    if (controls.moveForward !== 0) {
      const moveX = Math.sin(player.rotation) * controls.moveForward * this.TANK_SPEED;
      const moveZ = Math.cos(player.rotation) * controls.moveForward * this.TANK_SPEED;

      // 境界チェック
      const fieldLimit = game.gameType === '4player' ? 14 : 14;
      const newX = Math.max(-fieldLimit, Math.min(fieldLimit, player.position.x + moveX));
      const newZ = Math.max(-fieldLimit, Math.min(fieldLimit, player.position.z + moveZ));

      player.position.x = newX;
      player.position.z = newZ;
    }

    // タンクの回転
    if (controls.turn !== 0) {
      player.rotation += controls.turn * this.TURN_SPEED;
      // 回転値を0-2πの範囲に正規化
      player.rotation = ((player.rotation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    }

    // 砲塔の回転
    if (controls.turretTurn !== 0) {
      player.turretRotation += controls.turretTurn * this.TURRET_TURN_SPEED;
      // 回転値を0-2πの範囲に正規化
      player.turretRotation = ((player.turretRotation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    }

    // 射撃
    if (controls.shoot && now - player.lastShot > this.SHOT_COOLDOWN) {
      this.createBullet(game, player);
      player.lastShot = now;
    }

    return true;
  }

  private createBullet(game: TankGame, player: TankPlayer): void {
    const bulletId = crypto.randomUUID();

    // 砲塔の方向に弾丸を発射（Babylon.jsの座標系に合わせる）
    // Babylon.jsでは、Y軸回転で 0 = +Z方向, π/2 = +X方向
    const direction = {
      x: Math.sin(player.turretRotation),
      y: 0,
      z: Math.cos(player.turretRotation)
    };

    // 砲塔の先端から弾丸を発射
    const barrelLength = 1.5;
    const startPosition = {
      x: player.position.x + direction.x * barrelLength,
      y: player.position.y + 0.5,
      z: player.position.z + direction.z * barrelLength
    };

    game.bullets[bulletId] = {
      id: bulletId,
      playerId: player.id,
      position: startPosition,
      direction,
      speed: this.BULLET_SPEED,
      isActive: true,
      createdAt: Date.now()
    };
  }

  private startGameLoop(gameId: string): void {
    const interval = setInterval(() => {
      const game = this.games.get(gameId);
      if (!game || game.status !== 'playing') {
        clearInterval(interval);
        this.gameIntervals.delete(gameId);
        return;
      }

      this.updateBullets(game);
      this.checkBulletCollisions(game);
      this.checkGameEnd(game);
    }, 16); // 約60FPS

    this.gameIntervals.set(gameId, interval);
  }

  private updateBullets(game: TankGame): void {
    const now = Date.now();
    const toRemove: string[] = [];

    Object.values(game.bullets).forEach(bullet => {
      if (!bullet.isActive) return;

      // 弾丸の移動
      bullet.position.x += bullet.direction.x * bullet.speed;
      bullet.position.z += bullet.direction.z * bullet.speed;

      // 寿命チェック
      if (now - bullet.createdAt > this.BULLET_LIFETIME) {
        toRemove.push(bullet.id);
        return;
      }

      // 壁との衝突チェック
      const fieldLimit = game.gameType === '4player' ? 15 : 15;
      if (Math.abs(bullet.position.x) > fieldLimit || Math.abs(bullet.position.z) > fieldLimit) {
        toRemove.push(bullet.id);
      }
    });

    // 非アクティブな弾丸を削除
    toRemove.forEach(bulletId => {
      if (game.bullets[bulletId]) {
        game.bullets[bulletId].isActive = false;
      }
    });
  }

  private checkBulletCollisions(game: TankGame): void {
    const tankSize = 2.5; // タンクの当たり判定サイズ
    const toRemove: string[] = [];

    Object.values(game.bullets).forEach(bullet => {
      if (!bullet.isActive) return;

      // 他のタンクとの衝突チェック
      Object.values(game.players).forEach(player => {
        if (!player.isAlive || player.id === bullet.playerId) return;

        const dx = bullet.position.x - player.position.x;
        const dz = bullet.position.z - player.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < tankSize) {
          // ヒット！
          player.lives--;
          toRemove.push(bullet.id);

          if (player.lives <= 0) {
            player.isAlive = false;
            game.alivePlayers = game.alivePlayers.filter(id => id !== player.id);
          }
        }
      });
    });

    // 衝突した弾丸を削除
    toRemove.forEach(bulletId => {
      if (game.bullets[bulletId]) {
        game.bullets[bulletId].isActive = false;
      }
    });
  }

  private checkGameEnd(game: TankGame): void {
    if (game.alivePlayers.length <= 1) {
      const winner = game.alivePlayers[0];
      this.endGame(game.id, winner);
    }
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

  restartGame(gameId: string): TankGame | null {
    const oldGame = this.games.get(gameId);
    if (!oldGame) {
      return null;
    }

    // 新しいゲームを作成
    const newGame = this.createGame(oldGame.playerIds, oldGame.gameType);

    // 古いゲームを削除
    this.removeGame(gameId);

    return newGame;
  }

  removeGame(gameId: string): void {
    const interval = this.gameIntervals.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.gameIntervals.delete(gameId);
    }
    this.games.delete(gameId);
  }

  // 招待システム
  createInvitation(fromUserId: string, toUserId: string, gameType: '2player' | '4player' = '2player'): TankGameInvitation {
    const invitation: TankGameInvitation = {
      id: crypto.randomUUID(),
      fromUserId,
      toUserId,
      gameType,
      status: 'pending',
      createdAt: new Date()
    };

    this.invitations.set(invitation.id, invitation);
    return invitation;
  }

  getInvitation(id: string): TankGameInvitation | undefined {
    return this.invitations.get(id);
  }

  acceptInvitation(id: string): TankGame | null {
    const invitation = this.invitations.get(id);
    if (!invitation || invitation.status !== 'pending') {
      return null;
    }

    invitation.status = 'accepted';
    const game = this.createGame([invitation.fromUserId, invitation.toUserId], invitation.gameType);
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

  // 4プレイヤータンクキューシステム
  joinQueue4Player(playerId: string): TankGame | null {
    if (this.waitingRoom4Player.includes(playerId)) {
      return null;
    }

    this.waitingRoom4Player.push(playerId);

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