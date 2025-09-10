import { LoginForm } from '../components/LoginForm';
import { UserList } from '../components/UserList';
import { PongGame } from '../game/PongGame';
import { WebSocketService } from '../services/WebSocketService';
import { User } from '../types/User';

export class App {
  private container: HTMLElement;
  private wsService: WebSocketService;
  private currentUser: User | null = null;
  private currentGame: PongGame | null = null;

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
        (gameId: string) => this.startGame(gameId)
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
      <div class="min-h-screen bg-gray-900 p-4">
        <div class="max-w-6xl mx-auto">
          <div class="bg-gray-800 rounded-lg p-4 mb-4">
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
          
          <div class="bg-gray-800 rounded-lg p-4">
            <canvas id="game-canvas" class="w-full h-96"></canvas>
            <div class="mt-4 text-center text-gray-300">
              <p>Use W/S or Arrow Keys to move your paddle</p>
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = document.getElementById('game-canvas') as unknown as HTMLCanvasElement;
    canvas.width = 1200;
    canvas.height = 600;

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
    this.showUserList();
  }
}