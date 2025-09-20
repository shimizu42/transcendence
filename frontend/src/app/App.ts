import { LoginForm } from '../components/LoginForm';
import { UserList } from '../components/UserList';
import { PongGame } from '../game/PongGame';
import { TankGame } from '../game/TankGame';
import { WebSocketService } from '../services/WebSocketService';
import { User } from '../types/User';

export class App {
  private container: HTMLElement;
  private wsService: WebSocketService;
  private currentUser: User | null = null;
  private currentGame: PongGame | null = null;
  private currentTankGame: TankGame | null = null;
  private resizeHandler: (() => void) | null = null;

  constructor() {
    this.container = document.getElementById('app')!;
    this.wsService = new WebSocketService();
  }

  async init(): Promise<void> {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (savedUser && token) {
      this.currentUser = JSON.parse(savedUser);
      await this.showUserList();
    } else {
      this.showLogin();
    }
  }

  private showLogin(): void {
    const loginForm = new LoginForm(this.container, async (user: User) => {
      this.currentUser = user;
      await this.showUserList();
    });
    loginForm.render();
  }

  private async showUserList(): Promise<void> {
    try {
      console.log('Attempting to connect to WebSocket...');
      await this.wsService.connect();
      console.log('WebSocket connected successfully');
      
      console.log('Sending authentication token...');
      this.wsService.send('authenticate', { 
        token: localStorage.getItem('token') 
      });

      console.log('Initializing user list...');
      const userList = new UserList(
        this.container,
        this.currentUser!,
        this.wsService,
        (gameId: string) => this.startGame(gameId),
        (gameId: string) => this.startTankGame(gameId)
      );
      
      await userList.init();
      console.log('User list initialized successfully');
    } catch (error) {
      console.error('Failed to connect to server:', error);
      console.log('Falling back to login screen');
      this.showLogin();
    }
  }

  private async startGame(gameId: string): Promise<void> {
    this.container.innerHTML = `
      <div class="fixed inset-0 bg-gray-900 flex flex-col">
        <div class="bg-gray-800 p-4 shadow-lg">
          <div class="flex justify-between items-center">
            <h1 class="text-2xl font-bold text-white">Pong Game</h1>
            <div id="game-score" class="text-xl text-white">
              Waiting for game to start...
            </div>
            <button id="leave-game" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
              Leave Game
            </button>
          </div>
        </div>
        
        <div class="flex-1 flex flex-col items-center justify-center p-4">
          <canvas id="game-canvas" class="w-full h-full max-w-none max-h-none bg-black rounded-lg shadow-2xl"></canvas>
          <div class="absolute bottom-4 text-center text-gray-300 bg-black bg-opacity-50 px-4 py-2 rounded">
            <div class="text-sm">
              <p><strong>Controls:</strong></p>
              <p>2-Player: W/S or ↑/↓ to move paddle</p>
              <p>4-Player: W/A/S/D or Arrow Keys to move paddle</p>
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = document.getElementById('game-canvas') as unknown as HTMLCanvasElement;
    
    // Set canvas size to match available space
    const resizeCanvas = () => {
      const container = canvas.parentElement!;
      const containerRect = container.getBoundingClientRect();
      
      // Calculate available space (minus padding)
      const availableWidth = containerRect.width - 32; // 16px padding on each side
      const availableHeight = containerRect.height - 32;
      
      // Maintain aspect ratio (2:1)
      const aspectRatio = 2;
      let canvasWidth = availableWidth;
      let canvasHeight = canvasWidth / aspectRatio;
      
      if (canvasHeight > availableHeight) {
        canvasHeight = availableHeight;
        canvasWidth = canvasHeight * aspectRatio;
      }
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    };
    
    resizeCanvas();
    this.resizeHandler = resizeCanvas;
    window.addEventListener('resize', this.resizeHandler);

    this.currentGame = new PongGame(
      canvas,
      this.wsService,
      gameId,
      this.currentUser,
      () => this.endGame()
    );

    await this.currentGame.init();

    document.getElementById('leave-game')!.addEventListener('click', () => {
      this.wsService.send('leaveGame', { gameId });
      this.endGame();
    });
  }

  private endGame(): void {
    if (this.currentGame) {
      this.currentGame.dispose();
      this.currentGame = null;
    }

    if (this.currentTankGame) {
      this.currentTankGame.dispose();
      this.currentTankGame = null;
    }

    // Clean up resize event listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    this.showUserList();
  }

  private async startTankGame(gameId: string): Promise<void> {
    this.container.innerHTML = `
      <div class="fixed inset-0 bg-gray-900 flex flex-col">
        <div class="bg-gray-800 p-4 shadow-lg">
          <div class="flex justify-between items-center">
            <h1 class="text-2xl font-bold text-white">🚗 Tank Battle</h1>
            <div id="game-score" class="text-xl text-white">
              Waiting for tank battle to start...
            </div>
            <button id="leave-game" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
              Leave Game
            </button>
          </div>
        </div>

        <div class="flex-1 flex flex-col items-center justify-center p-4">
          <canvas id="game-canvas" class="w-full h-full max-w-none max-h-none bg-black rounded-lg shadow-2xl"></canvas>
          <div class="absolute bottom-4 text-center text-gray-300 bg-black bg-opacity-50 px-4 py-2 rounded">
            <div class="text-sm">
              <p><strong>Tank Controls:</strong></p>
              <p>W/A/S/D: Move tank and rotate</p>
              <p>Q/E: Rotate turret</p>
              <p>Space: Fire bullets</p>
              <p>Each tank has 3 lives. Last tank standing wins!</p>
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = document.getElementById('game-canvas') as unknown as HTMLCanvasElement;

    // Set canvas size to match available space
    const resizeCanvas = () => {
      const container = canvas.parentElement!;
      const containerRect = container.getBoundingClientRect();

      const availableWidth = containerRect.width - 32;
      const availableHeight = containerRect.height - 32;

      const aspectRatio = 1.5; // Tank game uses wider aspect ratio
      let canvasWidth = availableWidth;
      let canvasHeight = canvasWidth / aspectRatio;

      if (canvasHeight > availableHeight) {
        canvasHeight = availableHeight;
        canvasWidth = canvasHeight * aspectRatio;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    };

    resizeCanvas();
    this.resizeHandler = resizeCanvas;
    window.addEventListener('resize', this.resizeHandler);

    this.currentTankGame = new TankGame(
      canvas,
      this.wsService,
      gameId,
      this.currentUser,
      () => this.endTankGame()
    );

    await this.currentTankGame.init();

    document.getElementById('leave-game')!.addEventListener('click', () => {
      this.wsService.send('leaveTankGame', { gameId });
      this.endTankGame();
    });
  }

  private endTankGame(): void {
    if (this.currentTankGame) {
      this.currentTankGame.dispose();
      this.currentTankGame = null;
    }

    // Clean up resize event listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    this.showUserList();
  }
}