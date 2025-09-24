import { User, MatchHistory as MatchHistoryItem } from '../types/User';
import { ApiService } from '../services/ApiService';

export class MatchHistory {
  private container: HTMLElement;
  private apiService: ApiService;
  private currentUser: User;
  private onBack: () => void;
  private matches: MatchHistoryItem[] = [];
  private currentPage = 0;
  private pageSize = 10;
  private hasMoreMatches = true;

  constructor(container: HTMLElement, currentUser: User, onBack: () => void) {
    this.container = container;
    this.apiService = new ApiService();
    this.currentUser = currentUser;
    this.onBack = onBack;
  }

  async render(): Promise<void> {
    await this.loadMatches();

    this.container.innerHTML = `
      <div class="min-h-screen bg-gray-900 p-6">
        <div class="max-w-6xl mx-auto">
          <div class="bg-gray-800 rounded-lg shadow-lg p-6">
            <div class="flex justify-between items-center mb-6">
              <h1 class="text-3xl font-bold text-white">Match History</h1>
              <button id="back-btn" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                ← Back
              </button>
            </div>

            <!-- Filter Options -->
            <div class="bg-gray-700 rounded-lg p-4 mb-6">
              <div class="flex flex-wrap gap-4 items-center">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">Game Type</label>
                  <select id="game-type-filter" class="px-3 py-1 bg-gray-600 text-white rounded border border-gray-500">
                    <option value="all">All Games</option>
                    <option value="pong">Pong</option>
                    <option value="tank">Tank</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">Game Mode</label>
                  <select id="game-mode-filter" class="px-3 py-1 bg-gray-600 text-white rounded border border-gray-500">
                    <option value="all">All Modes</option>
                    <option value="2player">1v1</option>
                    <option value="4player">4 Player</option>
                    <option value="tournament">Tournament</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">Result</label>
                  <select id="result-filter" class="px-3 py-1 bg-gray-600 text-white rounded border border-gray-500">
                    <option value="all">All Results</option>
                    <option value="win">Wins</option>
                    <option value="loss">Losses</option>
                  </select>
                </div>
                <div class="flex items-end">
                  <button id="reset-filters" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-1 rounded">
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <!-- Summary Stats -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div class="bg-gray-700 p-4 rounded text-center">
                <div class="text-2xl font-bold text-blue-400" id="total-matches">${this.matches.length}</div>
                <div class="text-sm text-gray-300">Total Matches</div>
              </div>
              <div class="bg-gray-700 p-4 rounded text-center">
                <div class="text-2xl font-bold text-green-400" id="total-wins">${this.matches.filter(m => m.result === 'win').length}</div>
                <div class="text-sm text-gray-300">Wins</div>
              </div>
              <div class="bg-gray-700 p-4 rounded text-center">
                <div class="text-2xl font-bold text-red-400" id="total-losses">${this.matches.filter(m => m.result === 'loss').length}</div>
                <div class="text-sm text-gray-300">Losses</div>
              </div>
              <div class="bg-gray-700 p-4 rounded text-center">
                <div class="text-2xl font-bold text-yellow-400" id="win-rate">${this.matches.length > 0 ? ((this.matches.filter(m => m.result === 'win').length / this.matches.length) * 100).toFixed(1) : 0}%</div>
                <div class="text-sm text-gray-300">Win Rate</div>
              </div>
            </div>

            <!-- Match List -->
            <div class="bg-gray-700 rounded-lg p-6">
              <h2 class="text-xl font-semibold text-white mb-4">Recent Matches</h2>

              <div id="matches-container">
                ${this.renderMatches()}
              </div>

              ${this.hasMoreMatches ? `
                <div class="text-center mt-6">
                  <button id="load-more" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">
                    Load More Matches
                  </button>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Match Detail Modal -->
      <div id="match-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-white">Match Details</h3>
            <button id="close-modal" class="text-gray-400 hover:text-white">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div id="match-detail-content">
            <!-- Match details will be rendered here -->
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private async loadMatches(): Promise<void> {
    try {
      const newMatches = await this.apiService.getMatchHistory(
        this.currentUser.id,
        this.pageSize,
        this.currentPage * this.pageSize
      );

      if (newMatches.length < this.pageSize) {
        this.hasMoreMatches = false;
      }

      this.matches.push(...newMatches);
    } catch (error) {
      console.error('Failed to load match history:', error);
    }
  }

  private renderMatches(): string {
    if (this.matches.length === 0) {
      return `
        <div class="text-center py-8">
          <div class="text-gray-400 text-lg mb-2">No matches found</div>
          <div class="text-gray-500 text-sm">Start playing to build your match history!</div>
        </div>
      `;
    }

    return this.matches.map(match => this.renderMatchCard(match)).join('');
  }

  private renderMatchCard(match: MatchHistoryItem): string {
    const gameIcon = match.gameType === 'pong' ? '🏓' : '🚗';
    const resultColor = match.result === 'win' ? 'text-green-400' : 'text-red-400';
    const resultBg = match.result === 'win' ? 'bg-green-600' : 'bg-red-600';

    return `
      <div class="bg-gray-600 p-4 rounded-lg mb-3 hover:bg-gray-550 cursor-pointer match-card" data-match-id="${match.id}">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="text-2xl">${gameIcon}</div>
            <div>
              <div class="flex items-center space-x-2">
                <span class="text-white font-medium">${match.gameType.toUpperCase()}</span>
                <span class="text-gray-300">•</span>
                <span class="text-gray-300">${this.formatGameMode(match.gameMode)}</span>
                ${match.tournamentId ? '<span class="bg-purple-600 text-white text-xs px-2 py-1 rounded">Tournament</span>' : ''}
              </div>
              <div class="text-sm text-gray-400">
                vs ${match.opponentNames.join(', ')}
              </div>
              <div class="text-xs text-gray-500">
                ${this.formatDate(match.datePlayed)} • ${this.formatDuration(match.duration)}
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="flex items-center space-x-3">
              <div class="text-white">
                <span class="font-bold">${match.score}</span>
                <span class="text-gray-400 mx-1">-</span>
                <span>${match.opponentScores.join('-')}</span>
              </div>
              <div class="${resultBg} ${resultColor} px-3 py-1 rounded text-sm font-medium">
                ${match.result.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderMatchDetail(match: MatchHistoryItem): string {
    const gameIcon = match.gameType === 'pong' ? '🏓' : '🚗';
    const resultColor = match.result === 'win' ? 'text-green-400' : 'text-red-400';

    return `
      <div class="space-y-4">
        <div class="text-center">
          <div class="text-4xl mb-2">${gameIcon}</div>
          <div class="text-xl font-bold text-white">${match.gameType.toUpperCase()} ${this.formatGameMode(match.gameMode)}</div>
          ${match.tournamentId ? '<div class="bg-purple-600 text-white text-sm px-3 py-1 rounded inline-block mt-2">Tournament Match</div>' : ''}
        </div>

        <div class="bg-gray-700 p-4 rounded">
          <h4 class="text-lg font-semibold text-white mb-3">Match Result</h4>
          <div class="text-center">
            <div class="text-3xl font-bold ${resultColor} mb-2">${match.result.toUpperCase()}</div>
            <div class="text-xl text-white">
              <span class="font-bold">${match.score}</span>
              <span class="text-gray-400 mx-2">-</span>
              <span>${match.opponentScores.join(' - ')}</span>
            </div>
          </div>
        </div>

        <div class="bg-gray-700 p-4 rounded">
          <h4 class="text-lg font-semibold text-white mb-3">Opponents</h4>
          <div class="space-y-2">
            ${match.opponentNames.map((name, index) => `
              <div class="flex justify-between items-center">
                <span class="text-white">${name}</span>
                <span class="text-gray-300">${match.opponentScores[index]} points</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="bg-gray-700 p-4 rounded">
          <h4 class="text-lg font-semibold text-white mb-3">Match Details</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-400">Date:</span>
              <span class="text-white ml-2">${this.formatDate(match.datePlayed)}</span>
            </div>
            <div>
              <span class="text-gray-400">Duration:</span>
              <span class="text-white ml-2">${this.formatDuration(match.duration)}</span>
            </div>
            <div>
              <span class="text-gray-400">Game Mode:</span>
              <span class="text-white ml-2">${this.formatGameMode(match.gameMode)}</span>
            </div>
            <div>
              <span class="text-gray-400">Ranked:</span>
              <span class="text-white ml-2">${match.isRanked ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    const backBtn = document.getElementById('back-btn')!;
    backBtn.addEventListener('click', () => {
      this.onBack();
    });

    // Filter event listeners
    const gameTypeFilter = document.getElementById('game-type-filter')!;
    const gameModeFilter = document.getElementById('game-mode-filter')!;
    const resultFilter = document.getElementById('result-filter')!;
    const resetFiltersBtn = document.getElementById('reset-filters')!;

    [gameTypeFilter, gameModeFilter, resultFilter].forEach(filter => {
      filter.addEventListener('change', () => {
        this.applyFilters();
      });
    });

    resetFiltersBtn.addEventListener('click', () => {
      (gameTypeFilter as HTMLSelectElement).value = 'all';
      (gameModeFilter as HTMLSelectElement).value = 'all';
      (resultFilter as HTMLSelectElement).value = 'all';
      this.applyFilters();
    });

    // Load more button
    const loadMoreBtn = document.getElementById('load-more');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', async () => {
        this.currentPage++;
        await this.loadMatches();
        this.updateMatchesContainer();
      });
    }

    // Match card click handlers
    this.attachMatchCardListeners();

    // Modal close handler
    const closeModalBtn = document.getElementById('close-modal')!;
    const modal = document.getElementById('match-modal')!;

    closeModalBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    });
  }

  private attachMatchCardListeners(): void {
    const matchCards = document.querySelectorAll('.match-card');
    matchCards.forEach(card => {
      card.addEventListener('click', () => {
        const matchId = card.getAttribute('data-match-id')!;
        this.showMatchDetail(matchId);
      });
    });
  }

  private showMatchDetail(matchId: string): void {
    const match = this.matches.find(m => m.id === matchId);
    if (!match) return;

    const modal = document.getElementById('match-modal')!;
    const content = document.getElementById('match-detail-content')!;

    content.innerHTML = this.renderMatchDetail(match);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  private applyFilters(): void {
    const gameTypeFilter = (document.getElementById('game-type-filter') as HTMLSelectElement).value;
    const gameModeFilter = (document.getElementById('game-mode-filter') as HTMLSelectElement).value;
    const resultFilter = (document.getElementById('result-filter') as HTMLSelectElement).value;

    let filteredMatches = [...this.matches];

    if (gameTypeFilter !== 'all') {
      filteredMatches = filteredMatches.filter(m => m.gameType === gameTypeFilter);
    }

    if (gameModeFilter !== 'all') {
      filteredMatches = filteredMatches.filter(m => m.gameMode === gameModeFilter);
    }

    if (resultFilter !== 'all') {
      filteredMatches = filteredMatches.filter(m => m.result === resultFilter);
    }

    this.updateStatsDisplay(filteredMatches);
    this.updateMatchesDisplay(filteredMatches);
  }

  private updateStatsDisplay(matches: MatchHistoryItem[]): void {
    const totalMatches = document.getElementById('total-matches')!;
    const totalWins = document.getElementById('total-wins')!;
    const totalLosses = document.getElementById('total-losses')!;
    const winRate = document.getElementById('win-rate')!;

    const wins = matches.filter(m => m.result === 'win').length;
    const losses = matches.filter(m => m.result === 'loss').length;

    totalMatches.textContent = matches.length.toString();
    totalWins.textContent = wins.toString();
    totalLosses.textContent = losses.toString();
    winRate.textContent = matches.length > 0 ? ((wins / matches.length) * 100).toFixed(1) + '%' : '0%';
  }

  private updateMatchesDisplay(matches: MatchHistoryItem[]): void {
    const container = document.getElementById('matches-container')!;

    if (matches.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8">
          <div class="text-gray-400 text-lg mb-2">No matches found</div>
          <div class="text-gray-500 text-sm">Try adjusting your filters</div>
        </div>
      `;
    } else {
      container.innerHTML = matches.map(match => this.renderMatchCard(match)).join('');
      this.attachMatchCardListeners();
    }
  }

  private updateMatchesContainer(): void {
    const container = document.getElementById('matches-container')!;
    container.innerHTML = this.renderMatches();
    this.attachMatchCardListeners();
  }

  private formatGameMode(mode: string): string {
    switch (mode) {
      case '2player': return '1v1';
      case '4player': return '4 Player';
      case 'tournament': return 'Tournament';
      default: return mode;
    }
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}