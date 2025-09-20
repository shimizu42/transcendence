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
    lastShot: number;
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
    players: {
        [key: string]: TankPlayer;
    };
    bullets: {
        [key: string]: Bullet;
    };
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
export declare class TankGameService {
    private games;
    private gameIntervals;
    private invitations;
    private waitingRoom4Player;
    private readonly TANK_SPEED;
    private readonly TURN_SPEED;
    private readonly TURRET_TURN_SPEED;
    private readonly BULLET_SPEED;
    private readonly BULLET_LIFETIME;
    private readonly SHOT_COOLDOWN;
    private readonly INITIAL_LIVES;
    createGame(playerIds: string[], gameType?: '2player' | '4player'): TankGame;
    getGame(id: string): TankGame | undefined;
    startGame(gameId: string): boolean;
    handleTankControls(gameId: string, playerId: string, controls: TankControls): boolean;
    private createBullet;
    private startGameLoop;
    private updateBullets;
    private checkBulletCollisions;
    private checkGameEnd;
    endGame(gameId: string, winner?: string): boolean;
    restartGame(gameId: string): TankGame | null;
    removeGame(gameId: string): void;
    createInvitation(fromUserId: string, toUserId: string, gameType?: '2player' | '4player'): TankGameInvitation;
    getInvitation(id: string): TankGameInvitation | undefined;
    acceptInvitation(id: string): TankGame | null;
    declineInvitation(id: string): boolean;
    joinQueue4Player(playerId: string): TankGame | null;
    leaveQueue4Player(playerId: string): void;
    getWaitingCount4Player(): number;
}
//# sourceMappingURL=TankGameService.d.ts.map