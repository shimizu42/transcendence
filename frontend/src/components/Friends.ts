import { User, FriendRequest } from '../types/User';
import { ApiService } from '../services/ApiService';

export class Friends {
  private container: HTMLElement;
  private apiService: ApiService;
  private currentUser: User;
  private onBack: () => void;
  private friends: User[] = [];
  private friendRequests: FriendRequest[] = [];
  private searchResults: User[] = [];

  constructor(container: HTMLElement, currentUser: User, onBack: () => void) {
    this.container = container;
    this.apiService = new ApiService();
    this.currentUser = currentUser;
    this.onBack = onBack;
  }

  async render(): Promise<void> {
    await this.loadData();

    this.container.innerHTML = `
      <div class="min-h-screen bg-gray-900 p-6">
        <div class="max-w-6xl mx-auto">
          <div class="bg-gray-800 rounded-lg shadow-lg p-6">
            <div class="flex justify-between items-center mb-6">
              <h1 class="text-3xl font-bold text-white">Friends</h1>
              <button id="back-btn" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                ← Back
              </button>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Add Friends -->
              <div class="bg-gray-700 rounded-lg p-6">
                <h2 class="text-xl font-semibold text-white mb-4">Add Friends</h2>

                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Search Users</label>
                    <div class="flex space-x-2">
                      <input type="text" id="search-input" placeholder="Enter username..."
                             class="flex-1 px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:outline-none focus:border-blue-500">
                      <button id="search-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                        Search
                      </button>
                    </div>
                  </div>

                  <div id="search-results" class="space-y-2">
                    <!-- Search results will appear here -->
                  </div>
                </div>
              </div>

              <!-- Friend Requests -->
              <div class="bg-gray-700 rounded-lg p-6">
                <h2 class="text-xl font-semibold text-white mb-4">
                  Friend Requests
                  ${this.friendRequests.length > 0 ? `<span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full ml-2">${this.friendRequests.length}</span>` : ''}
                </h2>

                <div id="friend-requests" class="space-y-3">
                  ${this.renderFriendRequests()}
                </div>
              </div>

              <!-- Friends List -->
              <div class="bg-gray-700 rounded-lg p-6">
                <h2 class="text-xl font-semibold text-white mb-4">
                  My Friends (${this.friends.length})
                </h2>

                <div id="friends-list" class="space-y-3">
                  ${this.renderFriendsList()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Success/Error Messages -->
      <div id="message-container" class="fixed top-4 right-4 z-50"></div>
    `;

    this.attachEventListeners();
  }

  private async loadData(): Promise<void> {
    try {
      [this.friends, this.friendRequests] = await Promise.all([
        this.apiService.getFriends(),
        this.apiService.getFriendRequests()
      ]);
    } catch (error) {
      console.error('Failed to load friends data:', error);
      this.showMessage('Failed to load friends data', 'error');
    }
  }

  private renderFriendRequests(): string {
    if (this.friendRequests.length === 0) {
      return '<p class="text-gray-400 text-sm">No pending friend requests</p>';
    }

    return this.friendRequests.map(request => `
      <div class="bg-gray-600 p-3 rounded">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              ${request.fromUser?.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <div class="text-white font-medium">${request.fromUser?.username || 'Unknown'}</div>
              ${request.fromUser?.displayName ? `<div class="text-gray-300 text-sm">${request.fromUser.displayName}</div>` : ''}
            </div>
          </div>
          <div class="flex space-x-2">
            <button class="accept-request bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                    data-request-id="${request.id}">
              Accept
            </button>
            <button class="decline-request bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                    data-request-id="${request.id}">
              Decline
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  private renderFriendsList(): string {
    if (this.friends.length === 0) {
      return '<p class="text-gray-400 text-sm">No friends yet. Start by adding some!</p>';
    }

    return this.friends.map(friend => `
      <div class="bg-gray-600 p-3 rounded">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              ${friend.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="text-white font-medium">${friend.username}</div>
              ${friend.displayName ? `<div class="text-gray-300 text-sm">${friend.displayName}</div>` : ''}
              <div class="flex items-center space-x-2 mt-1">
                <div class="w-2 h-2 rounded-full ${friend.isOnline ? 'bg-green-500' : 'bg-gray-500'}"></div>
                <span class="text-xs text-gray-400">${friend.isOnline ? 'Online' : 'Offline'}</span>
                ${friend.isInGame ? '<span class="text-xs text-yellow-400">(In Game)</span>' : ''}
              </div>
            </div>
          </div>
          <div class="flex space-x-2">
            <button class="view-profile bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    data-user-id="${friend.id}">
              Profile
            </button>
            <button class="remove-friend bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                    data-user-id="${friend.id}">
              Remove
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  private renderSearchResults(): void {
    const container = document.getElementById('search-results')!;

    if (this.searchResults.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = this.searchResults.map(user => {
      const isFriend = this.friends.some(f => f.id === user.id);
      const hasPendingRequest = this.friendRequests.some(req => req.fromUserId === user.id);

      return `
        <div class="bg-gray-600 p-3 rounded">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                ${user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div class="text-white font-medium">${user.username}</div>
                ${user.displayName ? `<div class="text-gray-300 text-sm">${user.displayName}</div>` : ''}
              </div>
            </div>
            <div>
              ${isFriend ?
                '<span class="text-green-400 text-sm">Already friends</span>' :
                hasPendingRequest ?
                  '<span class="text-yellow-400 text-sm">Request pending</span>' :
                  `<button class="add-friend bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                           data-user-id="${user.id}">
                     Add Friend
                   </button>`
              }
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners to add friend buttons
    const addFriendBtns = container.querySelectorAll('.add-friend');
    addFriendBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = (e.target as HTMLElement).getAttribute('data-user-id')!;
        this.sendFriendRequest(userId);
      });
    });
  }

  private attachEventListeners(): void {
    const backBtn = document.getElementById('back-btn')!;
    backBtn.addEventListener('click', () => {
      this.onBack();
    });

    const searchBtn = document.getElementById('search-btn')!;
    const searchInput = document.getElementById('search-input') as HTMLInputElement;

    searchBtn.addEventListener('click', () => {
      this.searchUsers();
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchUsers();
      }
    });

    // Friend request buttons
    const acceptBtns = document.querySelectorAll('.accept-request');
    const declineBtns = document.querySelectorAll('.decline-request');

    acceptBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const requestId = (e.target as HTMLElement).getAttribute('data-request-id')!;
        this.respondToFriendRequest(requestId, 'accepted');
      });
    });

    declineBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const requestId = (e.target as HTMLElement).getAttribute('data-request-id')!;
        this.respondToFriendRequest(requestId, 'declined');
      });
    });

    // Remove friend buttons
    const removeBtns = document.querySelectorAll('.remove-friend');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = (e.target as HTMLElement).getAttribute('data-user-id')!;
        this.removeFriend(userId);
      });
    });
  }

  private async searchUsers(): Promise<void> {
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const query = searchInput.value.trim();

    if (query.length < 2) {
      this.showMessage('Please enter at least 2 characters', 'info');
      return;
    }

    try {
      this.searchResults = await this.apiService.searchUsers(query);
      // Filter out current user
      this.searchResults = this.searchResults.filter(user => user.id !== this.currentUser.id);
      this.renderSearchResults();
    } catch (error) {
      console.error('Failed to search users:', error);
      this.showMessage('Failed to search users', 'error');
    }
  }

  private async sendFriendRequest(userId: string): Promise<void> {
    try {
      await this.apiService.sendFriendRequest(userId);
      this.showMessage('Friend request sent!', 'success');

      // Update search results to show pending state
      this.renderSearchResults();
    } catch (error) {
      console.error('Failed to send friend request:', error);
      this.showMessage('Failed to send friend request', 'error');
    }
  }

  private async respondToFriendRequest(requestId: string, response: 'accepted' | 'declined'): Promise<void> {
    try {
      await this.apiService.respondToFriendRequest(requestId, response);
      this.showMessage(`Friend request ${response}!`, 'success');

      // Reload data and re-render
      await this.loadData();
      this.updateFriendRequestsSection();
      this.updateFriendsListSection();
    } catch (error) {
      console.error('Failed to respond to friend request:', error);
      this.showMessage('Failed to respond to friend request', 'error');
    }
  }

  private async removeFriend(userId: string): Promise<void> {
    if (!confirm('Are you sure you want to remove this friend?')) {
      return;
    }

    try {
      await this.apiService.removeFriend(userId);
      this.showMessage('Friend removed', 'success');

      // Reload data and re-render
      await this.loadData();
      this.updateFriendsListSection();
    } catch (error) {
      console.error('Failed to remove friend:', error);
      this.showMessage('Failed to remove friend', 'error');
    }
  }

  private updateFriendRequestsSection(): void {
    const container = document.getElementById('friend-requests')!;
    container.innerHTML = this.renderFriendRequests();

    // Re-attach event listeners for this section
    const acceptBtns = container.querySelectorAll('.accept-request');
    const declineBtns = container.querySelectorAll('.decline-request');

    acceptBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const requestId = (e.target as HTMLElement).getAttribute('data-request-id')!;
        this.respondToFriendRequest(requestId, 'accepted');
      });
    });

    declineBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const requestId = (e.target as HTMLElement).getAttribute('data-request-id')!;
        this.respondToFriendRequest(requestId, 'declined');
      });
    });
  }

  private updateFriendsListSection(): void {
    const container = document.getElementById('friends-list')!;
    container.innerHTML = this.renderFriendsList();

    // Re-attach event listeners for this section
    const removeBtns = container.querySelectorAll('.remove-friend');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = (e.target as HTMLElement).getAttribute('data-user-id')!;
        this.removeFriend(userId);
      });
    });
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    const container = document.getElementById('message-container')!;

    const messageEl = document.createElement('div');
    messageEl.className = `mb-4 p-4 rounded shadow-lg ${
      type === 'success' ? 'bg-green-600' :
      type === 'error' ? 'bg-red-600' : 'bg-blue-600'
    } text-white`;
    messageEl.textContent = message;

    container.appendChild(messageEl);

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (container.contains(messageEl)) {
        container.removeChild(messageEl);
      }
    }, 3000);
  }
}