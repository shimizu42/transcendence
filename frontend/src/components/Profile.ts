import { User } from '../types/User';
import { ApiService } from '../services/ApiService';

export class Profile {
  private container: HTMLElement;
  private apiService: ApiService;
  private currentUser: User;
  private onBack: () => void;

  constructor(container: HTMLElement, currentUser: User, onBack: () => void) {
    this.container = container;
    this.apiService = new ApiService();
    this.currentUser = currentUser;
    this.onBack = onBack;
  }

  async render(): Promise<void> {
    this.container.innerHTML = `
      <div class="min-h-screen bg-gray-900 p-6">
        <div class="max-w-4xl mx-auto">
          <div class="bg-gray-800 rounded-lg shadow-lg p-6">
            <div class="flex justify-between items-center mb-6">
              <h1 class="text-3xl font-bold text-white">User Profile</h1>
              <button id="back-btn" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                ← Back
              </button>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Profile Information -->
              <div class="bg-gray-700 rounded-lg p-6">
                <h2 class="text-xl font-semibold text-white mb-4">Profile Information</h2>

                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Username</label>
                    <input type="text" id="username" value="${this.currentUser.username}"
                           class="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:outline-none focus:border-blue-500" readonly>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
                    <input type="text" id="displayName" value="${this.currentUser.displayName || ''}"
                           placeholder="Enter display name"
                           class="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:outline-none focus:border-blue-500">
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Email</label>
                    <input type="email" id="email" value="${this.currentUser.email || ''}"
                           placeholder="Enter email address"
                           class="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:outline-none focus:border-blue-500">
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Bio</label>
                    <textarea id="bio" rows="4" placeholder="Tell us about yourself..."
                              class="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:outline-none focus:border-blue-500">${this.currentUser.bio || ''}</textarea>
                  </div>

                  <div class="flex space-x-3">
                    <button id="save-profile" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                      Save Changes
                    </button>
                    <button id="reset-profile" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              <!-- Profile Stats -->
              <div class="bg-gray-700 rounded-lg p-6">
                <h2 class="text-xl font-semibold text-white mb-4">Statistics Overview</h2>

                <div class="grid grid-cols-2 gap-4 mb-6">
                  <div class="bg-gray-600 p-4 rounded text-center">
                    <div class="text-2xl font-bold text-blue-400">${this.currentUser.stats?.totalGames || 0}</div>
                    <div class="text-sm text-gray-300">Total Games</div>
                  </div>
                  <div class="bg-gray-600 p-4 rounded text-center">
                    <div class="text-2xl font-bold text-green-400">${this.currentUser.stats?.wins || 0}</div>
                    <div class="text-sm text-gray-300">Wins</div>
                  </div>
                  <div class="bg-gray-600 p-4 rounded text-center">
                    <div class="text-2xl font-bold text-red-400">${this.currentUser.stats?.losses || 0}</div>
                    <div class="text-sm text-gray-300">Losses</div>
                  </div>
                  <div class="bg-gray-600 p-4 rounded text-center">
                    <div class="text-2xl font-bold text-yellow-400">${this.currentUser.stats?.winRate ? (this.currentUser.stats.winRate * 100).toFixed(1) : 0}%</div>
                    <div class="text-sm text-gray-300">Win Rate</div>
                  </div>
                </div>

                <!-- Game Type Stats -->
                <div class="grid grid-cols-1 gap-4">
                  <div class="bg-gray-600 p-4 rounded">
                    <h3 class="text-lg font-semibold text-white mb-2">🏓 Pong Stats</h3>
                    <div class="grid grid-cols-3 gap-2 text-sm">
                      <div class="text-center">
                        <div class="font-bold text-blue-400">${this.currentUser.stats?.pongStats?.gamesPlayed || 0}</div>
                        <div class="text-gray-300">Games</div>
                      </div>
                      <div class="text-center">
                        <div class="font-bold text-green-400">${this.currentUser.stats?.pongStats?.wins || 0}</div>
                        <div class="text-gray-300">Wins</div>
                      </div>
                      <div class="text-center">
                        <div class="font-bold text-yellow-400">${this.currentUser.stats?.pongStats?.bestScore || 0}</div>
                        <div class="text-gray-300">Best Score</div>
                      </div>
                    </div>
                  </div>

                  <div class="bg-gray-600 p-4 rounded">
                    <h3 class="text-lg font-semibold text-white mb-2">🚗 Tank Stats</h3>
                    <div class="grid grid-cols-3 gap-2 text-sm">
                      <div class="text-center">
                        <div class="font-bold text-blue-400">${this.currentUser.stats?.tankStats?.gamesPlayed || 0}</div>
                        <div class="text-gray-300">Games</div>
                      </div>
                      <div class="text-center">
                        <div class="font-bold text-green-400">${this.currentUser.stats?.tankStats?.wins || 0}</div>
                        <div class="text-gray-300">Wins</div>
                      </div>
                      <div class="text-center">
                        <div class="font-bold text-yellow-400">${this.currentUser.stats?.tankStats?.bestScore || 0}</div>
                        <div class="text-gray-300">Best Score</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-4 p-4 bg-gray-600 rounded">
                  <h3 class="text-lg font-semibold text-white mb-2">🏆 Achievements</h3>
                  <div class="grid grid-cols-2 gap-4 text-sm">
                    <div class="text-center">
                      <div class="font-bold text-purple-400">${this.currentUser.stats?.tournamentWins || 0}</div>
                      <div class="text-gray-300">Tournament Wins</div>
                    </div>
                    <div class="text-center">
                      <div class="font-bold text-orange-400">${this.currentUser.stats?.longestWinStreak || 0}</div>
                      <div class="text-gray-300">Longest Win Streak</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Account Information -->
            <div class="mt-6 bg-gray-700 rounded-lg p-6">
              <h2 class="text-xl font-semibold text-white mb-4">Account Information</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-300">Member since:</span>
                  <span class="text-white ml-2">${new Date(this.currentUser.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span class="text-gray-300">Last login:</span>
                  <span class="text-white ml-2">${this.currentUser.lastLoginAt ? new Date(this.currentUser.lastLoginAt).toLocaleDateString() : 'N/A'}</span>
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

  private attachEventListeners(): void {
    const backBtn = document.getElementById('back-btn')!;
    backBtn.addEventListener('click', () => {
      this.onBack();
    });

    const saveBtn = document.getElementById('save-profile')!;
    saveBtn.addEventListener('click', () => {
      this.saveProfile();
    });

    const resetBtn = document.getElementById('reset-profile')!;
    resetBtn.addEventListener('click', () => {
      this.resetForm();
    });
  }

  private async saveProfile(): Promise<void> {
    try {
      const displayName = (document.getElementById('displayName') as HTMLInputElement).value.trim();
      const email = (document.getElementById('email') as HTMLInputElement).value.trim();
      const bio = (document.getElementById('bio') as HTMLTextAreaElement).value.trim();

      const updates: any = {};
      if (displayName !== (this.currentUser.displayName || '')) {
        updates.displayName = displayName || undefined;
      }
      if (email !== (this.currentUser.email || '')) {
        updates.email = email || undefined;
      }
      if (bio !== (this.currentUser.bio || '')) {
        updates.bio = bio || undefined;
      }

      if (Object.keys(updates).length === 0) {
        this.showMessage('No changes to save', 'info');
        return;
      }

      const updatedUser = await this.apiService.updateProfile(updates);

      // Update current user object
      Object.assign(this.currentUser, updatedUser);

      // Update localStorage
      localStorage.setItem('user', JSON.stringify(this.currentUser));

      this.showMessage('Profile updated successfully!', 'success');
    } catch (error) {
      console.error('Failed to update profile:', error);
      this.showMessage('Failed to update profile. Please try again.', 'error');
    }
  }

  private resetForm(): void {
    (document.getElementById('displayName') as HTMLInputElement).value = this.currentUser.displayName || '';
    (document.getElementById('email') as HTMLInputElement).value = this.currentUser.email || '';
    (document.getElementById('bio') as HTMLTextAreaElement).value = this.currentUser.bio || '';
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
      container.removeChild(messageEl);
    }, 3000);
  }
}