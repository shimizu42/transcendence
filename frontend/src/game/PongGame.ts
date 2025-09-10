import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, MeshBuilder, StandardMaterial, Color3, DirectionalLight } from '@babylonjs/core';
import { WebSocketService } from '../services/WebSocketService';
import { GameState } from '../types/Game';

export class PongGame {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private wsService: WebSocketService;
  private gameId: string;
  private gameState: GameState | null = null;
  private onGameEnd: () => void;

  private ball: any;
  private paddle1: any;
  private paddle2: any;

  constructor(canvas: HTMLCanvasElement, wsService: WebSocketService, gameId: string, _currentUser: any, onGameEnd: () => void) {
    this.canvas = canvas;
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    this.wsService = wsService;
    this.gameId = gameId;
    this.onGameEnd = onGameEnd;
    
    this.camera = new ArcRotateCamera('camera', 0, Math.PI / 3, 20, Vector3.Zero(), this.scene);
  }

  async init(): Promise<void> {
    this.setupScene();
    this.createGameObjects();
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
    const ground = MeshBuilder.CreateGround('ground', { width: 20, height: 10 }, this.scene);
    const groundMaterial = new StandardMaterial('groundMaterial', this.scene);
    groundMaterial.diffuseColor = new Color3(0.1, 0.1, 0.2);
    ground.material = groundMaterial;

    this.ball = MeshBuilder.CreateSphere('ball', { diameter: 0.5 }, this.scene);
    this.ball.position = new Vector3(0, 0.25, 0);
    const ballMaterial = new StandardMaterial('ballMaterial', this.scene);
    ballMaterial.diffuseColor = new Color3(1, 1, 1);
    ballMaterial.emissiveColor = new Color3(0.2, 0.2, 0.2);
    this.ball.material = ballMaterial;

    this.paddle1 = MeshBuilder.CreateBox('paddle1', { width: 0.2, height: 1, depth: 2 }, this.scene);
    this.paddle1.position = new Vector3(-9, 0.5, 0);
    const paddle1Material = new StandardMaterial('paddle1Material', this.scene);
    paddle1Material.diffuseColor = new Color3(0, 1, 0);
    paddle1Material.emissiveColor = new Color3(0, 0.2, 0);
    this.paddle1.material = paddle1Material;

    this.paddle2 = MeshBuilder.CreateBox('paddle2', { width: 0.2, height: 1, depth: 2 }, this.scene);
    this.paddle2.position = new Vector3(9, 0.5, 0);
    const paddle2Material = new StandardMaterial('paddle2Material', this.scene);
    paddle2Material.diffuseColor = new Color3(1, 0, 0);
    paddle2Material.emissiveColor = new Color3(0.2, 0, 0);
    this.paddle2.material = paddle2Material;

    const walls = [
      { name: 'topWall', position: new Vector3(0, 0.5, 5), size: { width: 20, height: 1, depth: 0.2 } },
      { name: 'bottomWall', position: new Vector3(0, 0.5, -5), size: { width: 20, height: 1, depth: 0.2 } }
    ];

    walls.forEach(wall => {
      const wallMesh = MeshBuilder.CreateBox(wall.name, wall.size, this.scene);
      wallMesh.position = wall.position;
      const wallMaterial = new StandardMaterial(`${wall.name}Material`, this.scene);
      wallMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3);
      wallMesh.material = wallMaterial;
    });
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
      
      if (keys['w'] || keys['arrowup']) {
        paddleMove = 0.2;
      }
      if (keys['s'] || keys['arrowdown']) {
        paddleMove = -0.2;
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
      this.updateGameObjects();
      
      if (state.gameStatus === 'finished') {
        this.showGameEndModal(state.winner!);
      }
    });

    this.wsService.on('playerAssignment', (_data: { playerId: string; playerNumber: number }) => {
      // Player assignment handled
    });
  }

  private updateGameObjects(): void {
    if (!this.gameState) return;

    this.ball.position.x = this.gameState.ball.x;
    this.ball.position.y = this.gameState.ball.y;
    this.ball.position.z = this.gameState.ball.z;

    this.paddle1.position.z = this.gameState.player1.paddleY;
    this.paddle2.position.z = this.gameState.player2.paddleY;

    this.updateUI();
  }

  private updateUI(): void {
    if (!this.gameState) return;

    const scoreElement = document.getElementById('game-score');
    if (scoreElement) {
      scoreElement.textContent = `${this.gameState.player1.username}: ${this.gameState.player1.score} - ${this.gameState.player2.username}: ${this.gameState.player2.score}`;
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