import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, MeshBuilder, StandardMaterial, Color3, DirectionalLight, Mesh } from '@babylonjs/core';
import { WebSocketService } from '../services/WebSocketService';
import { TankPlayer, Bullet, TankGameState } from '../types/Game';

export class TankGame {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private wsService: WebSocketService;
  private gameId: string;
  private gameState: TankGameState | null = null;
  private onGameEnd: () => void;
  private playerId: string;

  private tanks: { [key: string]: { body: Mesh; turret: Mesh } } = {};
  private bullets: { [key: string]: Mesh } = {};
  private walls: Mesh[] = [];
  private ground: Mesh | null = null;

  private keys: { [key: string]: boolean } = {};

  constructor(canvas: HTMLCanvasElement, wsService: WebSocketService, gameId: string, currentUser: any, onGameEnd: () => void) {
    this.canvas = canvas;
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    this.wsService = wsService;
    this.gameId = gameId;
    this.onGameEnd = onGameEnd;
    this.playerId = currentUser.id;

    this.camera = new ArcRotateCamera('camera', 0, Math.PI / 4, 30, Vector3.Zero(), this.scene);
  }

  async init(): Promise<void> {
    this.setupScene();
    this.setupControls();
    this.setupWebSocketListeners();

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    window.addEventListener('resize', () => {
      this.engine.resize();
    });

    this.wsService.send('joinTankGame', { gameId: this.gameId });
  }

  private setupScene(): void {
    this.camera.attachControl(this.canvas, true);

    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.7;

    const dirLight = new DirectionalLight('dirLight', new Vector3(-1, -1, -1), this.scene);
    dirLight.intensity = 0.5;

    this.scene.createDefaultSkybox();
  }

  private createGameField(): void {
    if (!this.gameState) return;

    // Create ground
    const fieldSize = this.gameState.gameType === '4player' ? 30 : 30;
    const fieldDepth = this.gameState.gameType === '4player' ? 30 : 20;

    this.ground = MeshBuilder.CreateGround('ground', { width: fieldSize, height: fieldDepth }, this.scene);
    const groundMaterial = new StandardMaterial('groundMaterial', this.scene);
    groundMaterial.diffuseColor = new Color3(0.2, 0.3, 0.1);
    this.ground.material = groundMaterial;

    // Create walls around the field
    this.createBoundaryWalls(fieldSize, fieldDepth);
  }

  private createBoundaryWalls(width: number, depth: number): void {
    const wallHeight = 2;
    const wallThickness = 0.5;

    const wallConfigs = [
      { name: 'northWall', position: new Vector3(0, wallHeight/2, depth/2), size: { width: width + wallThickness, height: wallHeight, depth: wallThickness } },
      { name: 'southWall', position: new Vector3(0, wallHeight/2, -depth/2), size: { width: width + wallThickness, height: wallHeight, depth: wallThickness } },
      { name: 'eastWall', position: new Vector3(width/2, wallHeight/2, 0), size: { width: wallThickness, height: wallHeight, depth: depth } },
      { name: 'westWall', position: new Vector3(-width/2, wallHeight/2, 0), size: { width: wallThickness, height: wallHeight, depth: depth } }
    ];

    wallConfigs.forEach(wall => {
      const wallMesh = MeshBuilder.CreateBox(wall.name, wall.size, this.scene);
      wallMesh.position = wall.position;
      const wallMaterial = new StandardMaterial(`${wall.name}Material`, this.scene);
      wallMaterial.diffuseColor = new Color3(0.4, 0.4, 0.4);
      wallMesh.material = wallMaterial;
      this.walls.push(wallMesh);
    });
  }

  private createTank(player: TankPlayer, playerIndex: number): void {
    const colors = [
      new Color3(0, 0.8, 0),    // Green
      new Color3(0.8, 0, 0),    // Red
      new Color3(0, 0, 0.8),    // Blue
      new Color3(0.8, 0.8, 0)   // Yellow
    ];

    // Create tank body
    const tankBody = MeshBuilder.CreateBox(`tank_body_${player.id}`, { width: 2, height: 0.5, depth: 3 }, this.scene);
    tankBody.position = new Vector3(player.position.x, 0.25, player.position.z);

    const bodyMaterial = new StandardMaterial(`tank_body_material_${player.id}`, this.scene);
    const color = colors[playerIndex % colors.length];
    bodyMaterial.diffuseColor = color;
    tankBody.material = bodyMaterial;

    // Create turret
    const turret = MeshBuilder.CreateCylinder(`tank_turret_${player.id}`, { diameter: 1.2, height: 0.3 }, this.scene);
    turret.position = tankBody.position.clone();
    turret.position.y = tankBody.position.y + 0.4;

    const turretMaterial = new StandardMaterial(`tank_turret_material_${player.id}`, this.scene);
    turretMaterial.diffuseColor = color.scale(0.8);
    turret.material = turretMaterial;

    // Create gun barrel
    const barrel = MeshBuilder.CreateCylinder(`tank_barrel_${player.id}`, { diameter: 0.2, height: 2 }, this.scene);
    barrel.rotation.z = Math.PI / 2;
    barrel.position = turret.position.clone();
    barrel.position.x += 1; // Offset forward
    barrel.setParent(turret);

    const barrelMaterial = new StandardMaterial(`tank_barrel_material_${player.id}`, this.scene);
    barrelMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3);
    barrel.material = barrelMaterial;

    this.tanks[player.id] = { body: tankBody, turret };
  }

  private setupControls(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    this.scene.registerBeforeRender(() => {
      this.handleInput();
    });
  }

  private handleInput(): void {
    if (!this.gameState) return;

    const myPlayer = this.gameState.players[this.playerId];
    if (!myPlayer || !myPlayer.isAlive) return;

    let moveForward = 0;
    let turn = 0;
    let turretTurn = 0;
    let shoot = false;

    // Tank movement
    if (this.keys['w'] || this.keys['arrowup']) {
      moveForward = 1;
    }
    if (this.keys['s'] || this.keys['arrowdown']) {
      moveForward = -1;
    }

    // Tank rotation
    if (this.keys['a'] || this.keys['arrowleft']) {
      turn = -1;
    }
    if (this.keys['d'] || this.keys['arrowright']) {
      turn = 1;
    }

    // Turret rotation
    if (this.keys['q']) {
      turretTurn = -1;
    }
    if (this.keys['e']) {
      turretTurn = 1;
    }

    // Shooting
    if (this.keys[' '] || this.keys['spacebar']) {
      shoot = true;
    }

    // Send controls to server
    if (moveForward !== 0 || turn !== 0 || turretTurn !== 0 || shoot) {
      this.wsService.send('tankControls', {
        gameId: this.gameId,
        moveForward,
        turn,
        turretTurn,
        shoot
      });
    }
  }

  private setupWebSocketListeners(): void {
    this.wsService.on('tankGameState', (state: TankGameState) => {
      this.gameState = state;

      // Create game field on first state update
      if (!this.ground) {
        this.createGameField();
      }

      this.updateGameObjects();

      if (state.gameStatus === 'finished') {
        this.showGameEndModal(state.winner!);
      }
    });

    // Listen for tank game end event from backend
    this.wsService.on('tankGameEnd', (data: { winner: string; winnerId: string; gameId: string; showVictoryScreen: boolean }) => {
      console.log('Tank game ended:', data);
      this.showGameEndModal(data.winner);
    });

    this.wsService.on('tankPlayerAssignment', (data: { playerId: string; playerNumber: number; side?: string }) => {
      console.log('Tank player assignment received:', data);
      if (data.playerId === this.playerId) {
        if (this.gameState?.gameType === '4player' && data.side) {
          this.adjustCameraFor4Player(data.side);
        }
      }
    });
  }

  private updateGameObjects(): void {
    if (!this.gameState) return;

    this.updateTanks();
    this.updateBullets();
    this.updateUI();
  }

  private updateTanks(): void {
    if (!this.gameState) return;

    Object.values(this.gameState.players).forEach((player: TankPlayer, index) => {
      if (!this.tanks[player.id] && player.isAlive) {
        this.createTank(player, index);
      }

      const tank = this.tanks[player.id];
      if (tank && player.isAlive) {
        // Update tank position and rotation
        tank.body.position = new Vector3(player.position.x, 0.25, player.position.z);
        tank.body.rotation.y = player.rotation;

        // Update turret position and rotation
        tank.turret.position = new Vector3(player.position.x, 0.65, player.position.z);
        tank.turret.rotation.y = player.turretRotation;

        tank.body.setEnabled(true);
        tank.turret.setEnabled(true);
      } else if (tank && !player.isAlive) {
        tank.body.setEnabled(false);
        tank.turret.setEnabled(false);
      }
    });
  }

  private updateBullets(): void {
    if (!this.gameState) return;

    // Remove inactive bullets
    Object.keys(this.bullets).forEach(bulletId => {
      if (!this.gameState!.bullets[bulletId] || !this.gameState!.bullets[bulletId].isActive) {
        if (this.bullets[bulletId]) {
          this.bullets[bulletId].dispose();
          delete this.bullets[bulletId];
        }
      }
    });

    // Create new bullets
    Object.values(this.gameState.bullets).forEach((bullet: Bullet) => {
      if (bullet.isActive && !this.bullets[bullet.id]) {
        this.createBullet(bullet);
      }

      // Update bullet position
      if (this.bullets[bullet.id] && bullet.isActive) {
        this.bullets[bullet.id].position = new Vector3(bullet.position.x, bullet.position.y, bullet.position.z);
      }
    });
  }

  private createBullet(bullet: Bullet): void {
    const bulletMesh = MeshBuilder.CreateSphere(`bullet_${bullet.id}`, { diameter: 0.2 }, this.scene);
    bulletMesh.position = new Vector3(bullet.position.x, bullet.position.y, bullet.position.z);

    const bulletMaterial = new StandardMaterial(`bullet_material_${bullet.id}`, this.scene);
    bulletMaterial.diffuseColor = new Color3(1, 1, 0);
    bulletMaterial.emissiveColor = new Color3(0.5, 0.5, 0);
    bulletMesh.material = bulletMaterial;

    this.bullets[bullet.id] = bulletMesh;
  }

  private adjustCameraFor4Player(playerSide: string): void {
    if (this.gameState?.gameType !== '4player') return;

    switch (playerSide) {
      case 'top':
        this.camera.alpha = Math.PI;
        break;
      case 'bottom':
        this.camera.alpha = 0;
        break;
      case 'left':
        this.camera.alpha = Math.PI / 2;
        break;
      case 'right':
        this.camera.alpha = -Math.PI / 2;
        break;
    }
    this.camera.beta = Math.PI / 4;
    this.camera.radius = 35;
  }

  private updateUI(): void {
    if (!this.gameState) return;

    const scoreElement = document.getElementById('game-score');
    if (scoreElement) {
      const alivePlayers = Object.values(this.gameState.players)
        .filter((p: TankPlayer) => p.isAlive)
        .map((p: TankPlayer) => `${p.username}: ${p.lives} lives`)
        .join(' | ');
      scoreElement.textContent = `Tank Battle - ${alivePlayers}`;
    }
  }

  private showGameEndModal(winner: string): void {
    if (!this.gameState) return;

    const currentPlayer = this.gameState.players[this.playerId];
    const isWinner = currentPlayer && currentPlayer.username === winner;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
    modal.innerHTML = `
      <div class="bg-gray-800 p-8 rounded-lg text-center border-2 ${isWinner ? 'border-green-500' : 'border-red-500'}">
        <h2 class="text-3xl font-bold mb-4 ${isWinner ? 'text-green-400' : 'text-red-400'}">
          ${isWinner ? '🎉 Victory!' : '💥 Defeat!'}
        </h2>
        <p class="text-xl text-gray-300 mb-2">
          ${isWinner ? 'Congratulations!' : 'Better luck next time!'}
        </p>
        <p class="text-lg text-gray-400 mb-6">
          ${winner} wins the tank battle!
        </p>
        <button id="back-to-home" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">
          Back to Home
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('back-to-home')!.addEventListener('click', () => {
      document.body.removeChild(modal);
      this.onGameEnd();
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
        this.onGameEnd();
      }
    }, 5000);
  }

  dispose(): void {
    this.engine.dispose();
  }
}