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
  private inQueue4Player: boolean = false;

  constructor(container: HTMLElement, currentUser: User, wsService: WebSocketService, onGameStart: (gameId: string) => void) {
    this.container = container;
    this.apiService = new ApiService();
    this.wsService = wsService;
    this.currentUser = currentUser;
    this.onGameStart = onGameStart;
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
              <div class="flex space-x-4 mb-6">
                <button id="join-4player-queue" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold text-lg">
                  🎮 Join 4-Player Battle
                </button>
                <div id="queue-status" class="flex items-center text-gray-300">
                  <span id="queue-info">Click to join the 4-player queue!</span>
                </div>
              </div>
            </div>
            
            <div class="bg-gray-700 rounded-lg p-4">
              <h2 class="text-xl font-semibold text-white mb-4">1vs1 Challenges</h2>
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
        <button 
          class="challenge-btn bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded ${user.isInGame ? 'opacity-50 cursor-not-allowed' : ''}"
          ${user.isInGame ? 'disabled' : ''}
          data-user-id="${user.id}"
        >
          Challenge
        </button>
      </div>
    `).join('');

    // Add event listeners to challenge buttons
    const challengeButtons = document.querySelectorAll('.challenge-btn');
    challengeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const userId = (e.target as HTMLElement).getAttribute('data-user-id');
        if (userId) {
          console.log('Challenge button clicked for user:', userId);
          this.inviteUser(userId);
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
  }

  private inviteUser(userId: string): void {
    console.log('Sending game invite to user:', userId);
    this.wsService.send('gameInvite', { toUserId: userId });
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
}