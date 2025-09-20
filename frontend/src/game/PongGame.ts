import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, MeshBuilder, StandardMaterial, Color3, DirectionalLight } from '@babylonjs/core';
import { WebSocketService } from '../services/WebSocketService';
import { GameState, Player } from '../types/Game';

export class PongGame {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private wsService: WebSocketService;
  private gameId: string;
  private gameState: GameState | null = null;
  private onGameEnd: () => void;
  private playerId: string;

  private ball: any;
  private paddles: { [key: string]: any } = {};
  private walls: any[] = [];

  constructor(canvas: HTMLCanvasElement, wsService: WebSocketService, gameId: string, currentUser: any, onGameEnd: () => void) {
    this.canvas = canvas;
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    this.wsService = wsService;
    this.gameId = gameId;
    this.onGameEnd = onGameEnd;
    this.playerId = currentUser.id;
    
    this.camera = new ArcRotateCamera('camera', 0, Math.PI / 3, 25, Vector3.Zero(), this.scene);
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

    this.wsService.send('joinGame', { gameId: this.gameId });
  }

  private setupScene(): void {
    this.camera.attachControl(this.canvas, true);
    
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.7;

    const dirLight = new DirectionalLight('dirLight', new Vector3(-1, -1, -1), this.scene);
    dirLight.intensity = 0.5;

    this.scene.createDefaultSkybox();
  }

  private createGameObjects(): void {
    // Create playing field - for 4-player: square field, for 2-player: rectangular field
    const fieldSize = this.gameState?.gameType === '4player' ? 20 : 20;
    const fieldDepth = this.gameState?.gameType === '4player' ? 20 : 10;
    
    const ground = MeshBuilder.CreateGround('ground', { width: fieldSize, height: fieldDepth }, this.scene);
    const groundMaterial = new StandardMaterial('groundMaterial', this.scene);
    groundMaterial.diffuseColor = new Color3(0.1, 0.1, 0.2);
    ground.material = groundMaterial;

    // Create ball
    this.ball = MeshBuilder.CreateSphere('ball', { diameter: 0.5 }, this.scene);
    this.ball.position = new Vector3(0, 0.25, 0);
    const ballMaterial = new StandardMaterial('ballMaterial', this.scene);
    ballMaterial.diffuseColor = new Color3(1, 1, 1);
    ballMaterial.emissiveColor = new Color3(0.2, 0.2, 0.2);
    this.ball.material = ballMaterial;

    // Create walls based on game type
    if (this.gameState?.gameType === '4player') {
      // For 4-player: initially no walls, they will be created dynamically when players lose
      // No walls created here - they will be added when players are eliminated
    } else {
      // For 2-player: create top and bottom walls only
      const wallConfigs = [
        { name: 'topWall', position: new Vector3(0, 0.5, 5), size: { width: 20, height: 1, depth: 0.2 } },
        { name: 'bottomWall', position: new Vector3(0, 0.5, -5), size: { width: 20, height: 1, depth: 0.2 } }
      ];
      
      wallConfigs.forEach(wall => {
        const wallMesh = MeshBuilder.CreateBox(wall.name, wall.size, this.scene);
        wallMesh.position = wall.position;
        const wallMaterial = new StandardMaterial(`${wall.name}Material`, this.scene);
        wallMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3);
        wallMesh.material = wallMaterial;
        this.walls.push(wallMesh);
      });
    }
  }

  private setupControls(): void {
    let keys: { [key: string]: boolean } = {};

    window.addEventListener('keydown', (e) => {
      keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      keys[e.key.toLowerCase()] = false;
    });

    this.scene.registerBeforeRender(() => {
      let paddleMove = 0;
      
      // Controls work for both 2-player and 4-player modes
      if (keys['w'] || keys['arrowup']) {
        paddleMove = 1;
      }
      if (keys['s'] || keys['arrowdown']) {
        paddleMove = -1;
      }
      if (keys['a'] || keys['arrowleft']) {
        paddleMove = -1;
      }
      if (keys['d'] || keys['arrowright']) {
        paddleMove = 1;
      }

      if (paddleMove !== 0) {
        this.wsService.send('paddleMove', { 
          gameId: this.gameId, 
          direction: paddleMove 
        });
      }
    });
  }

  private setupWebSocketListeners(): void {
    this.wsService.on('gameState', (state: GameState) => {
      this.gameState = state;
      
      // Create game objects on first state update
      if (!this.ball) {
        this.createGameObjects();
      }
      
      this.updateGameObjects();
      
      if (state.gameStatus === 'finished') {
        this.showGameEndModal(state.winner!);
      }
    });

    this.wsService.on('playerAssignment', (data: { playerId: string; playerNumber: number; side?: string }) => {
      console.log('Player assignment received:', data);
      if (data.playerId === this.playerId) {
        // This is our player assignment
        if (this.gameState?.gameType === '4player' && data.side) {
          this.adjustCameraFor4Player(data.side);
        }
      }
    });
  }

  private updateGameObjects(): void {
    if (!this.gameState) return;

    // Update ball position
    this.ball.position.x = this.gameState.ball.x;
    this.ball.position.y = this.gameState.ball.y;
    this.ball.position.z = this.gameState.ball.z;

    // Create or update paddles based on game state
    this.updatePaddles();
    this.updateUI();
  }

  private updatePaddles(): void {
    if (!this.gameState) return;

    Object.values(this.gameState.players).forEach((player: Player, index) => {
      if (!this.paddles[player.id]) {
        this.createPaddle(player, index);
      }
      
      const paddle = this.paddles[player.id];
      if (paddle && player.isAlive) {
        this.updatePaddlePosition(paddle, player);
        paddle.setEnabled(true);
      } else if (paddle) {
        paddle.setEnabled(false);
        // Create wall for eliminated player in 4-player mode
        if (this.gameState?.gameType === '4player') {
          this.createWallForEliminatedPlayer(player);
        }
      }
    });
  }

  private createPaddle(player: Player, index: number): void {
    const colors = [
      new Color3(0, 1, 0),    // Green
      new Color3(1, 0, 0),    // Red
      new Color3(0, 0, 1),    // Blue
      new Color3(1, 1, 0)     // Yellow
    ];

    let paddleSize;
    let position;
    
    if (this.gameState?.gameType === '4player') {
      // 4-player mode: paddles on each side of the square
      paddleSize = { width: 2, height: 1, depth: 0.2 };
      
      switch (player.side) {
        case 'left':
          position = new Vector3(-9.5, 0.5, player.paddlePosition);
          paddleSize = { width: 0.2, height: 1, depth: 2 };
          break;
        case 'right':
          position = new Vector3(9.5, 0.5, player.paddlePosition);
          paddleSize = { width: 0.2, height: 1, depth: 2 };
          break;
        case 'top':
          position = new Vector3(player.paddlePosition, 0.5, 9.5);
          paddleSize = { width: 2, height: 1, depth: 0.2 };
          break;
        case 'bottom':
          position = new Vector3(player.paddlePosition, 0.5, -9.5);
          paddleSize = { width: 2, height: 1, depth: 0.2 };
          break;
        default:
          position = new Vector3(0, 0.5, 0);
      }
    } else {
      // 2-player mode: paddles on left and right
      paddleSize = { width: 0.2, height: 1, depth: 2 };
      position = player.side === 'left' 
        ? new Vector3(-9, 0.5, player.paddlePosition)
        : new Vector3(9, 0.5, player.paddlePosition);
    }

    const paddle = MeshBuilder.CreateBox(`paddle_${player.id}`, paddleSize, this.scene);
    paddle.position = position;
    
    const paddleMaterial = new StandardMaterial(`paddle_${player.id}_material`, this.scene);
    const color = colors[index % colors.length];
    paddleMaterial.diffuseColor = color;
    paddleMaterial.emissiveColor = color.scale(0.2);
    paddle.material = paddleMaterial;
    
    this.paddles[player.id] = paddle;
  }

  private updatePaddlePosition(paddle: any, player: Player): void {
    if (this.gameState?.gameType === '4player') {
      switch (player.side) {
        case 'left':
        case 'right':
          paddle.position.z = player.paddlePosition;
          break;
        case 'top':
        case 'bottom':
          paddle.position.x = player.paddlePosition;
          break;
      }
    } else {
      paddle.position.z = player.paddlePosition;
    }
  }

  private createWallForEliminatedPlayer(player: Player): void {
    const wallId = `wall_${player.id}`;
    
    // Check if wall already exists
    if (this.scene.getMeshByName(wallId)) {
      return;
    }

    let wallConfig;
    switch (player.side) {
      case 'left':
        wallConfig = { position: new Vector3(-10.2, 0.5, 0), size: { width: 0.4, height: 1, depth: 20 } };
        break;
      case 'right':
        wallConfig = { position: new Vector3(10.2, 0.5, 0), size: { width: 0.4, height: 1, depth: 20 } };
        break;
      case 'top':
        wallConfig = { position: new Vector3(0, 0.5, 10.2), size: { width: 20, height: 1, depth: 0.4 } };
        break;
      case 'bottom':
        wallConfig = { position: new Vector3(0, 0.5, -10.2), size: { width: 20, height: 1, depth: 0.4 } };
        break;
      default:
        return;
    }

    const wallMesh = MeshBuilder.CreateBox(wallId, wallConfig.size, this.scene);
    wallMesh.position = wallConfig.position;
    const wallMaterial = new StandardMaterial(`${wallId}Material`, this.scene);
    wallMaterial.diffuseColor = new Color3(0.5, 0.1, 0.1); // Red color to indicate eliminated player's wall
    wallMaterial.emissiveColor = new Color3(0.1, 0, 0);
    wallMesh.material = wallMaterial;
    this.walls.push(wallMesh);
  }

  private adjustCameraFor4Player(playerSide: string): void {
    if (this.gameState?.gameType !== '4player') return;

    // Adjust camera position and target based on player's side
    switch (playerSide) {
      case 'left':
        this.camera.setTarget(Vector3.Zero());
        this.camera.alpha = Math.PI; // Looking from left side
        break;
      case 'right':
        this.camera.setTarget(Vector3.Zero());
        this.camera.alpha = 0; // Looking from right side
        break;
      case 'top':
        this.camera.setTarget(Vector3.Zero());
        this.camera.alpha = Math.PI / 2; // Looking from top
        break;
      case 'bottom':
        this.camera.setTarget(Vector3.Zero());
        this.camera.alpha = -Math.PI / 2; // Looking from bottom
        break;
    }
    this.camera.beta = Math.PI / 3;
    this.camera.radius = 30;
  }

  private updateUI(): void {
    if (!this.gameState) return;

    const scoreElement = document.getElementById('game-score');
    if (scoreElement) {
      if (this.gameState.gameType === '4player') {
        // Show lives and alive status for 4-player
        const alivePlayers = Object.values(this.gameState.players)
          .filter((p: Player) => p.isAlive)
          .map((p: Player) => `${p.username}: ${p.lives} lives`)
          .join(' | ');
        scoreElement.textContent = `Alive: ${alivePlayers}`;
      } else {
        // Show scores for 2-player
        const players = Object.values(this.gameState.players) as Player[];
        if (players.length >= 2) {
          scoreElement.textContent = `${players[0].username}: ${players[0].score} - ${players[1].username}: ${players[1].score}`;
        }
      }
    }
  }

  private showGameEndModal(winner: string): void {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
    modal.innerHTML = `
      <div class="bg-gray-800 p-8 rounded-lg text-center">
        <h2 class="text-2xl font-bold text-white mb-4">Game Over!</h2>
        <p class="text-xl text-gray-300 mb-6">${winner} wins!</p>
        <button id="back-to-lobby" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">
          Back to Lobby
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('back-to-lobby')!.addEventListener('click', () => {
      document.body.removeChild(modal);
      this.onGameEnd();
    });
  }

  dispose(): void {
    this.engine.dispose();
  }
}