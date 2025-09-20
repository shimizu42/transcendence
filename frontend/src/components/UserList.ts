import { User } from '../types/User';
import { ApiService } from '../services/ApiService';
import { WebSocketService } from '../services/WebSocketService';

export class UserList {
  private container: HTMLElement;
  private apiService: ApiService;
  private wsService: WebSocketService;
  private currentUser: User;
  private users: User[] = [];
  private onGameStart: (gameId: string) => void;
  private onTankGameStart: (gameId: string) => void;
  private onTournamentStart: () => void;
  private inQueue4Player: boolean = false;
  private inTankQueue4Player: boolean = false;

  constructor(container: HTMLElement, currentUser: User, wsService: WebSocketService, onGameStart: (gameId: string) => void, onTankGameStart?: (gameId: string) => void, onTournamentStart?: () => void) {
    this.container = container;
    this.apiService = new ApiService();
    this.wsService = wsService;
    this.currentUser = currentUser;
    this.onGameStart = onGameStart;
    this.onTankGameStart = onTankGameStart || onGameStart;
    this.onTournamentStart = onTournamentStart || (() => {});
  }

  async init(): Promise<void> {
    console.log('UserList: Setting up WebSocket listeners...');
    this.setupWebSocketListeners();
    console.log('UserList: Loading users...');
    await this.loadUsers();
    console.log('UserList: Rendering UI...');
    this.render();
    console.log('UserList: Initialization complete');
  }

  private setupWebSocketListeners(): void {
    this.wsService.on('userUpdate', (users: User[]) => {
      this.users = users;
      this.renderUserList();
    });

    this.wsService.on('gameInvitation', (invitation: any) => {
      this.showInvitationModal(invitation);
    });

    this.wsService.on('gameStart', (data: { gameId: string }) => {
      this.onGameStart(data.gameId);
    });

    this.wsService.on('queueUpdate', (data: { waiting: number; needed: number }) => {
      const queueInfo = document.getElementById('queue-info')!;
      queueInfo.textContent = `Waiting for players: ${data.waiting}/4 (${data.needed} more needed)`;
    });

    this.wsService.on('leftQueue', () => {
      this.inQueue4Player = false;
      this.updateQueueButton();
    });

    // Tank game listeners
    this.wsService.on('tankGameStart', (data: { gameId: string }) => {
      this.onTankGameStart(data.gameId);
    });

    this.wsService.on('tankGameInvitation', (invitation: any) => {
      this.showTankInvitationModal(invitation);
    });

    // 4-player tank queue listeners
    this.wsService.on('tankQueueUpdate', (data: { waiting: number; needed: number }) => {
      const queueInfo = document.getElementById('tank-queue-info')!;
      queueInfo.textContent = `Waiting for players: ${data.waiting}/4 (${data.needed} more needed)`;
    });

    this.wsService.on('leftTankQueue', () => {
      this.inTankQueue4Player = false;
      this.updateTankQueueButton();
    });
  }

  private async loadUsers(): Promise<void> {
    try {
      this.users = await this.apiService.getUsers();
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }

  render(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-gray-900 p-6">
        <div class="max-w-4xl mx-auto">
          <div class="bg-gray-800 rounded-lg shadow-lg p-6">
            <div class="flex justify-between items-center mb-6">
              <h1 class="text-3xl font-bold text-white">Transcendence Pong</h1>
              <div class="flex items-center space-x-4">
                <span class="text-green-400">Welcome, ${this.currentUser.username}!</span>
                <button id="logout-btn" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
                  Logout
                </button>
              </div>
            </div>

            <div class="bg-gray-700 rounded-lg p-4 mb-4">
              <h2 class="text-xl font-semibold text-white mb-4">Game Modes</h2>

              <!-- Tournament Mode -->
              <div class="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-lg mb-4">
                <h3 class="text-xl font-bold text-white mb-2">🏆 Tournament Mode</h3>
                <p class="text-purple-100 text-sm mb-3">4-player tournament: Semifinals → Final → Champion!</p>
                <button id="start-tournament" class="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-bold w-full">
                  🎯 Join Tournament
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div class="bg-gray-600 p-4 rounded-lg">
                  <h3 class="text-lg font-bold text-white mb-2">4-Player Pong Battle</h3>
                  <p class="text-gray-300 text-sm mb-3">Classic 4-player pong with elimination gameplay!</p>
                  <button id="join-4player-queue" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold w-full mb-2">
                    🎮 Join 4-Player Pong
                  </button>
                  <div class="text-center text-gray-300 text-sm">
                    <span id="queue-info">Click to join the 4-player queue!</span>
                  </div>
                </div>
                <div class="bg-gray-600 p-4 rounded-lg">
                  <h3 class="text-lg font-bold text-white mb-2">4-Player Tank Battle</h3>
                  <p class="text-gray-300 text-sm mb-3">Tank combat with turrets and shooting! Last tank standing wins!</p>
                  <button id="join-4player-tank-queue" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold w-full mb-2">
                    🚗 Join 4-Player Tank
                  </button>
                  <div class="text-center text-gray-300 text-sm">
                    <span id="tank-queue-info">Click to join the 4-player tank queue!</span>
                  </div>
                </div>
              </div>
              <div class="bg-gray-600 p-3 rounded text-sm text-gray-300">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <strong>Pong Controls:</strong> W/S or ↑/↓ for 2P, W/A/S/D or arrows for 4P
                  </div>
                  <div>
                    <strong>Tank Controls:</strong> W/A/S/D to move, Q/E to rotate turret, Space to shoot
                  </div>
                </div>
              </div>
            </div>
            
            <div class="bg-gray-700 rounded-lg p-4">
              <h2 class="text-xl font-semibold text-white mb-4">Challenge Other Players</h2>
              <div id="user-list" class="space-y-2">
                <!-- User list will be rendered here -->
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Invitation Modal -->
      <div id="invitation-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center">
        <div class="bg-gray-800 p-6 rounded-lg">
          <h3 class="text-xl font-bold text-white mb-4">Game Invitation</h3>
          <p id="invitation-text" class="text-gray-300 mb-4"></p>
          <div class="flex space-x-4">
            <button id="accept-invitation" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
              Accept
            </button>
            <button id="decline-invitation" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
              Decline
            </button>
          </div>
        </div>
      </div>
    `;

    this.renderUserList();
    this.attachEventListeners();
  }

  private renderUserList(): void {
    const userListContainer = document.getElementById('user-list')!;
    
    const otherUsers = this.users.filter(user => user.id !== this.currentUser.id);
    
    if (otherUsers.length === 0) {
      userListContainer.innerHTML = '<p class="text-gray-400">No other players online</p>';
      return;
    }

    userListContainer.innerHTML = otherUsers.map(user => `
      <div class="flex items-center justify-between bg-gray-600 p-3 rounded">
        <div class="flex items-center space-x-3">
          <div class="w-3 h-3 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-500'}"></div>
          <span class="text-white">${user.username}</span>
          ${user.isInGame ? '<span class="text-yellow-400 text-sm">(In Game)</span>' : ''}
        </div>
        <div class="flex space-x-2">
          <button
            class="pong-challenge-btn bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm ${user.isInGame ? 'opacity-50 cursor-not-allowed' : ''}"
            ${user.isInGame ? 'disabled' : ''}
            data-user-id="${user.id}"
          >
            🏓 Pong
          </button>
          <button
            class="tank-challenge-btn bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm ${user.isInGame ? 'opacity-50 cursor-not-allowed' : ''}"
            ${user.isInGame ? 'disabled' : ''}
            data-user-id="${user.id}"
          >
            🚗 Tank
          </button>
        </div>
      </div>
    `).join('');

    // Add event listeners to pong challenge buttons
    const pongChallengeButtons = document.querySelectorAll('.pong-challenge-btn');
    pongChallengeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const userId = (e.target as HTMLElement).getAttribute('data-user-id');
        if (userId) {
          console.log('Pong challenge button clicked for user:', userId);
          this.inviteUser(userId);
        }
      });
    });

    // Add event listeners to tank challenge buttons
    const tankChallengeButtons = document.querySelectorAll('.tank-challenge-btn');
    tankChallengeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const userId = (e.target as HTMLElement).getAttribute('data-user-id');
        if (userId) {
          console.log('Tank challenge button clicked for user:', userId);
          this.inviteTankUser(userId);
        }
      });
    });
  }

  private attachEventListeners(): void {
    const logoutBtn = document.getElementById('logout-btn')!;
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      location.reload();
    });

    const join4PlayerBtn = document.getElementById('join-4player-queue')!;
    join4PlayerBtn.addEventListener('click', () => {
      if (this.inQueue4Player) {
        console.log('Leaving 4-player queue');
        this.wsService.send('leaveQueue4Player', {});
        this.inQueue4Player = false;
        this.updateQueueButton();
      } else {
        console.log('Joining 4-player queue');
        this.wsService.send('joinQueue4Player', {});
        this.inQueue4Player = true;
        this.updateQueueButton();
      }
    });

    // 4-player tank queue button
    const join4PlayerTankBtn = document.getElementById('join-4player-tank-queue')!;
    join4PlayerTankBtn.addEventListener('click', () => {
      if (this.inTankQueue4Player) {
        console.log('Leaving 4-player tank queue');
        this.wsService.send('leaveTankQueue4Player', {});
        this.inTankQueue4Player = false;
        this.updateTankQueueButton();
      } else {
        console.log('Joining 4-player tank queue');
        this.wsService.send('joinTankQueue4Player', {});
        this.inTankQueue4Player = true;
        this.updateTankQueueButton();
      }
    });

    // Tournament mode button
    const startTournamentBtn = document.getElementById('start-tournament')!;
    startTournamentBtn.addEventListener('click', () => {
      console.log('Starting tournament mode');
      this.onTournamentStart();
    });
  }

  private inviteUser(userId: string): void {
    console.log('Sending pong game invite to user:', userId);
    this.wsService.send('gameInvite', { toUserId: userId });
  }

  private inviteTankUser(userId: string): void {
    console.log('Sending tank game invite to user:', userId);
    this.wsService.send('tankGameInvite', { toUserId: userId });
  }

  private showInvitationModal(invitation: any): void {
    const modal = document.getElementById('invitation-modal')!;
    const text = document.getElementById('invitation-text')!;
    const acceptBtn = document.getElementById('accept-invitation')!;
    const declineBtn = document.getElementById('decline-invitation')!;

    text.textContent = `${invitation.fromUser.username} has challenged you to a game!`;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    acceptBtn.onclick = () => {
      this.wsService.send('gameInviteResponse', { 
        invitationId: invitation.id, 
        response: 'accept' 
      });
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    };

    declineBtn.onclick = () => {
      this.wsService.send('gameInviteResponse', { 
        invitationId: invitation.id, 
        response: 'decline' 
      });
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    };
  }

  private showTankInvitationModal(invitation: any): void {
    const modal = document.getElementById('invitation-modal')!;
    const text = document.getElementById('invitation-text')!;
    const acceptBtn = document.getElementById('accept-invitation')!;
    const declineBtn = document.getElementById('decline-invitation')!;

    text.textContent = `${invitation.fromUser.username} has challenged you to a tank battle!`;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    acceptBtn.onclick = () => {
      this.wsService.send('tankGameInviteResponse', {
        invitationId: invitation.id,
        response: 'accept'
      });
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    };

    declineBtn.onclick = () => {
      this.wsService.send('tankGameInviteResponse', {
        invitationId: invitation.id,
        response: 'decline'
      });
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    };
  }

  private updateQueueButton(): void {
    const button = document.getElementById('join-4player-queue')! as HTMLButtonElement;
    const queueInfo = document.getElementById('queue-info')!;
    
    if (this.inQueue4Player) {
      button.textContent = '❌ Leave Queue';
      button.className = 'bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold text-lg';
      queueInfo.textContent = 'You are in the 4-player queue. Waiting for other players...';
    } else {
      button.textContent = '🎮 Join 4-Player Battle';
      button.className = 'bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold text-lg';
      queueInfo.textContent = 'Click to join the 4-player queue!';
    }
  }

  private updateTankQueueButton(): void {
    const button = document.getElementById('join-4player-tank-queue')! as HTMLButtonElement;
    const queueInfo = document.getElementById('tank-queue-info')!;

    if (this.inTankQueue4Player) {
      button.textContent = '❌ Leave Tank Queue';
      button.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold w-full mb-2';
      queueInfo.textContent = 'You are in the 4-player tank queue. Waiting for other players...';
    } else {
      button.textContent = '🚗 Join 4-Player Tank';
      button.className = 'bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold w-full mb-2';
      queueInfo.textContent = 'Click to join the 4-player tank queue!';
    }
  }
}