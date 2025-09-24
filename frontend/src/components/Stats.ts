import { User, UserStats, LeaderboardEntry } from '../types/User';
import { ApiService } from '../services/ApiService';

export class Stats {
  private container: HTMLElement;
  private apiService: ApiService;
  private currentUser: User;
  private onBack: () => void;
  private userStats: UserStats | null = null;
  private leaderboard: LeaderboardEntry[] = [];
  private currentGameType: 'all' | 'pong' | 'tank' = 'all';

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
              <h1 class="text-3xl font-bold text-white">Statistics & Leaderboard</h1>
              <button id="back-btn" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                ← Back
              </button>
            </div>

            <!-- Game Type Filter -->
            <div class="mb-6">
              <div class="flex space-x-2">
                <button id="filter-all" class="game-filter ${this.currentGameType === 'all' ? 'bg-blue-600' : 'bg-gray-600'} hover:bg-blue-700 text-white px-4 py-2 rounded">
                  All Games
                </button>
                <button id="filter-pong" class="game-filter ${this.currentGameType === 'pong' ? 'bg-blue-600' : 'bg-gray-600'} hover:bg-blue-700 text-white px-4 py-2 rounded">
                  🏓 Pong
                </button>
                <button id="filter-tank" class="game-filter ${this.currentGameType === 'tank' ? 'bg-blue-600' : 'bg-gray-600'} hover:bg-blue-700 text-white px-4 py-2 rounded">
                  🚗 Tank
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Personal Statistics -->
              <div class="bg-gray-700 rounded-lg p-6">
                <h2 class="text-xl font-semibold text-white mb-4">Your Statistics</h2>
                ${this.renderPersonalStats()}
              </div>

              <!-- Leaderboard -->
              <div class="bg-gray-700 rounded-lg p-6">
                <h2 class="text-xl font-semibold text-white mb-4">
                  Leaderboard - ${this.currentGameType === 'all' ? 'Overall' : this.currentGameType.charAt(0).toUpperCase() + this.currentGameType.slice(1)}
                </h2>
                ${this.renderLeaderboard()}
              </div>
            </div>

            <!-- Detailed Statistics -->
            <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <!-- Overall Stats -->
              <div class="bg-gray-700 rounded-lg p-6">
                <h3 class="text-lg font-semibold text-white mb-4">🎯 Overall Performance</h3>
                <div class="space-y-3">
                  <div class="flex justify-between">
                    <span class="text-gray-300">Total Games</span>
                    <span class="text-white font-bold">${this.userStats?.totalGames || 0}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-300">Wins</span>
                    <span class="text-green-400 font-bold">${this.userStats?.wins || 0}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-300">Losses</span>
                    <span class="text-red-400 font-bold">${this.userStats?.losses || 0}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-300">Win Rate</span>
                    <span class="text-yellow-400 font-bold">${this.userStats?.winRate ? this.userStats.winRate.toFixed(1) : 0}%</span>
                  </div>
                </div>
              </div>

              <!-- Pong Statistics -->
              <div class="bg-gray-700 rounded-lg p-6">
                <h3 class="text-lg font-semibold text-white mb-4">🏓 Pong Statistics</h3>
                <div class="space-y-3">
                  <div class="flex justify-between">
                    <span class="text-gray-300">Games Played</span>
                    <span class="text-white font-bold">${this.userStats?.pongStats?.gamesPlayed || 0}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-300">Wins</span>
                    <span class="text-green-400 font-bold">${this.userStats?.pongStats?.wins || 0}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-300">Win Rate</span>
                    <span class="text-yellow-400 font-bold">${this.userStats?.pongStats?.winRate ? this.userStats.pongStats.winRate.toFixed(1) : 0}%</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-300">Best Score</span>
                    <span class="text-blue-400 font-bold">${this.userStats?.pongStats?.bestScore || 0}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-300">Avg Duration</span>
                    <span class="text-purple-400 font-bold">${this.userStats?.pongStats?.averageGameDuration ? this.formatDuration(this.userStats.pongStats.averageGameDuration) : '0s'}</span>
                  </div>
                </div>
              </div>

              <!-- Tank Statistics -->
              <div class="bg-gray-700 rounded-lg p-6">
                <h3 class="text-lg font-semibold text-white mb-4">🚗 Tank Statistics</h3>
                <div class="space-y-3">
                  <div class="flex justify-between">
                    <span class="text-gray-300">Games Played</span>
                    <span class="text-white font-bold">${this.userStats?.tankStats?.gamesPlayed || 0}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-300">Wins</span>
                    <span class="text-green-400 font-bold">${this.userStats?.tankStats?.wins || 0}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-300">Win Rate</span>
                    <span class="text-yellow-400 font-bold">${this.userStats?.tankStats?.winRate ? this.userStats.tankStats.winRate.toFixed(1) : 0}%</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-300">Best Score</span>
                    <span class="text-blue-400 font-bold">${this.userStats?.tankStats?.bestScore || 0}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-300">Avg Duration</span>
                    <span class="text-purple-400 font-bold">${this.userStats?.tankStats?.averageGameDuration ? this.formatDuration(this.userStats.tankStats.averageGameDuration) : '0s'}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Achievements Section -->
            <div class="mt-6 bg-gray-700 rounded-lg p-6">
              <h3 class="text-lg font-semibold text-white mb-4">🏆 Achievements & Records</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-gray-600 p-4 rounded text-center">
                  <div class="text-2xl font-bold text-purple-400">${this.userStats?.tournamentWins || 0}</div>
                  <div class="text-sm text-gray-300">Tournament Wins</div>
                </div>
                <div class="bg-gray-600 p-4 rounded text-center">
                  <div class="text-2xl font-bold text-orange-400">${this.userStats?.longestWinStreak || 0}</div>
                  <div class="text-sm text-gray-300">Longest Win Streak</div>
                </div>
                <div class="bg-gray-600 p-4 rounded text-center">
                  <div class="text-2xl font-bold text-cyan-400">${this.userStats?.currentWinStreak || 0}</div>
                  <div class="text-sm text-gray-300">Current Win Streak</div>
                </div>
                <div class="bg-gray-600 p-4 rounded text-center">
                  <div class="text-2xl font-bold text-pink-400">${this.getCurrentRank()}</div>
                  <div class="text-sm text-gray-300">Current Rank</div>
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
      this.userStats = await this.apiService.getUserStats(this.currentUser.id);

      const gameType = this.currentGameType === 'all' ? undefined : this.currentGameType;
      this.leaderboard = await this.apiService.getLeaderboard(gameType as 'pong' | 'tank', 10);
    } catch (error) {
      console.error('Failed to load stats data:', error);
      this.showMessage('Failed to load statistics data', 'error');
    }
  }

  private renderPersonalStats(): string {
    if (!this.userStats) {
      return '<p class="text-gray-400">No statistics available</p>';
    }

    const stats = this.userStats;
    const gameTypeStats = this.currentGameType === 'pong' ? stats.pongStats :
                         this.currentGameType === 'tank' ? stats.tankStats : null;

    if (this.currentGameType !== 'all' && gameTypeStats) {
      return `
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-600 p-4 rounded text-center">
            <div class="text-2xl font-bold text-blue-400">${gameTypeStats.gamesPlayed}</div>
            <div class="text-sm text-gray-300">Games Played</div>
          </div>
          <div class="bg-gray-600 p-4 rounded text-center">
            <div class="text-2xl font-bold text-green-400">${gameTypeStats.wins}</div>
            <div class="text-sm text-gray-300">Wins</div>
          </div>
          <div class="bg-gray-600 p-4 rounded text-center">
            <div class="text-2xl font-bold text-red-400">${gameTypeStats.losses}</div>
            <div class="text-sm text-gray-300">Losses</div>
          </div>
          <div class="bg-gray-600 p-4 rounded text-center">
            <div class="text-2xl font-bold text-yellow-400">${gameTypeStats.winRate.toFixed(1)}%</div>
            <div class="text-sm text-gray-300">Win Rate</div>
          </div>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-4">
          <div class="bg-gray-600 p-4 rounded text-center">
            <div class="text-2xl font-bold text-purple-400">${gameTypeStats.bestScore}</div>
            <div class="text-sm text-gray-300">Best Score</div>
          </div>
          <div class="bg-gray-600 p-4 rounded text-center">
            <div class="text-2xl font-bold text-cyan-400">${this.formatDuration(gameTypeStats.averageGameDuration)}</div>
            <div class="text-sm text-gray-300">Avg Duration</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-gray-600 p-4 rounded text-center">
          <div class="text-2xl font-bold text-blue-400">${stats.totalGames}</div>
          <div class="text-sm text-gray-300">Total Games</div>
        </div>
        <div class="bg-gray-600 p-4 rounded text-center">
          <div class="text-2xl font-bold text-green-400">${stats.wins}</div>
          <div class="text-sm text-gray-300">Wins</div>
        </div>
        <div class="bg-gray-600 p-4 rounded text-center">
          <div class="text-2xl font-bold text-red-400">${stats.losses}</div>
          <div class="text-sm text-gray-300">Losses</div>
        </div>
        <div class="bg-gray-600 p-4 rounded text-center">
          <div class="text-2xl font-bold text-yellow-400">${stats.winRate.toFixed(1)}%</div>
          <div class="text-sm text-gray-300">Win Rate</div>
        </div>
      </div>
    `;
  }

  private renderLeaderboard(): string {
    if (this.leaderboard.length === 0) {
      return '<p class="text-gray-400">No leaderboard data available</p>';
    }

    return `
      <div class="space-y-3">
        ${this.leaderboard.map((entry) => {
          const isCurrentUser = entry.user.id === this.currentUser.id;
          return `
            <div class="bg-gray-600 p-3 rounded ${isCurrentUser ? 'ring-2 ring-blue-500' : ''}">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 ${this.getRankColor(entry.rank)} rounded-full flex items-center justify-center text-white font-bold text-sm">
                    ${entry.rank}
                  </div>
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    ${entry.user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div class="text-white font-medium ${isCurrentUser ? 'text-blue-400' : ''}">${entry.user.username}</div>
                    ${entry.user.displayName ? `<div class="text-gray-300 text-sm">${entry.user.displayName}</div>` : ''}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-white font-bold">${entry.stats.wins}W - ${entry.stats.losses}L</div>
                  <div class="text-yellow-400 text-sm">${entry.stats.winRate.toFixed(1)}% WR</div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  private attachEventListeners(): void {
    const backBtn = document.getElementById('back-btn')!;
    backBtn.addEventListener('click', () => {
      this.onBack();
    });

    const filterBtns = document.querySelectorAll('.game-filter');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const filter = target.id.replace('filter-', '') as 'all' | 'pong' | 'tank';
        this.changeGameTypeFilter(filter);
      });
    });
  }

  private async changeGameTypeFilter(gameType: 'all' | 'pong' | 'tank'): Promise<void> {
    this.currentGameType = gameType;
    await this.loadData();
    this.render();
  }

  private getRankColor(rank: number): string {
    if (rank === 1) return 'bg-yellow-500';
    if (rank === 2) return 'bg-gray-400';
    if (rank === 3) return 'bg-orange-600';
    if (rank <= 10) return 'bg-blue-600';
    return 'bg-gray-600';
  }

  private getCurrentRank(): string {
    const currentUserEntry = this.leaderboard.find(entry => entry.user.id === this.currentUser.id);
    return currentUserEntry ? `#${currentUserEntry.rank}` : 'N/A';
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
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

    setTimeout(() => {
      if (container.contains(messageEl)) {
        container.removeChild(messageEl);
      }
    }, 3000);
  }
}