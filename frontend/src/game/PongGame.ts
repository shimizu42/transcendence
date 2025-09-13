import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, MeshBuilder, StandardMaterial, Color3, DirectionalLight } from '@babylonjs/core';
import { WebSocketService } from '../services/WebSocketService';
import { GameState } from '../types/Game';

type GameEndPayload = {
  winner: string | 1 | 2;
  score: string;
  p1: number;
  p2: number;
};

export class PongGame {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private wsService: WebSocketService;
  private gameId: string;
  private gameState: GameState | null = null;
  private onGameEnd: (winner: string, score: string) => void;

  private ended: boolean = false;
  private onGameEndMsg = (data: GameEndPayload) => {
    if (this.ended) return;
    this.ended = true;

    let winnerName: string;
    if (typeof data.winner === 'string') {
      winnerName = data.winner.length ? data.winner : 'Unknown';
    } else {
      winnerName =
       data.winner === 1
        ? (this.gameState?.player1.username ?? 'Player 1')
        : (this.gameState?.player2.username ?? 'Player 2');
    }

    let finalScore: string;
    if (data.score){
      finalScore = data.score;
    } else if (data.p1 != null && data.p2 != null) {
      finalScore = `${data.p1} - ${data.p2}`;
    } else {
      let baseP1 = this.lastScoreBeforeEnd ? this.lastScoreBeforeEnd.p1 : (this.gameState?.player1.score ?? 0);
      let baseP2 = this.lastScoreBeforeEnd ? this.lastScoreBeforeEnd.p2 : (this.gameState?.player2.score ?? 0);
      if (winnerName === (this.gameState?.player1.username ?? 'Player 1'))
        baseP1 += 1;
      else
        baseP2 += 1;
      finalScore = `${baseP1} - ${baseP2}`;
    }
      
    this.onGameEnd(winnerName, finalScore);
  };
  private lastScoreBeforeEnd: { p1: number; p2: number } | null = null;
  private ball: any;
  private paddle1: any;
  private paddle2: any;

  constructor(canvas: HTMLCanvasElement, wsService: WebSocketService, gameId: string, _currentUser: any, onGameEnd: (winner: string, score:string) => void) {
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
    this.wsService.on('gameState', this.onGameStateMsg);
    this.wsService.on('gameEnd', this.onGameEndMsg);
  }

  private onGameStateMsg = (state: GameState) => {
    this.gameState = state;
    if (state.gameStatus !== 'finished') {
      this.lastScoreBeforeEnd = { p1: state.player1.score, p2: state.player2.score };
    }
    this.updateGameObjects();
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

  dispose(): void {
    this.wsService.off('gameEnd', this.onGameEndMsg);
    this.camera.detachControl();
    this.engine.dispose();
    
  }
}
