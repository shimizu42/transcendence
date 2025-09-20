import { WebSocketService } from '../services/WebSocketService';
import { User } from '../types/User';

interface TournamentMatch {
  id: string;
  round: number;
  matchNumber: number;
  player1Id?: string;
  player2Id?: string;
  winnerId?: string;
  gameId?: string;
  status: 'waiting' | 'playing' | 'finished';
}

interface TournamentData {
  id: string;
  playerIds: string[];
  matches: TournamentMatch[];
  currentRound: number;
  status: 'waiting' | 'semifinal' | 'final' | 'finished';
  winnerId?: string;
}

export class Tournament {
  private container: HTMLElement;
  private wsService: WebSocketService;
  private currentUser: User;
  private onGameStart: (gameId: string) => void;
  private onExit: () => void;
  private tournament: TournamentData | null = null;
  private queuePosition: number | null = null;
  private isInGame: boolean = false;

  constructor(
    container: HTMLElement,
    wsService: WebSocketService,
    currentUser: User,
    onGameStart: (gameId: string) => void,
    onExit: () => void
  ) {
    this.container = container;
    this.wsService = wsService;
    this.currentUser = currentUser;
    this.onGameStart = onGameStart;
    this.onExit = onExit;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.wsService.on('tournamentStart', (tournament: TournamentData) => {
      console.log('Tournament started:', tournament);
      this.tournament = tournament;
      this.render();
    });

    this.wsService.on('tournamentQueue', (data: { position: number }) => {
      console.log('Tournament queue position:', data.position);
      this.queuePosition = data.position;
      this.render();
    });

    this.wsService.on('tournamentUpdate', (tournament: TournamentData) => {
      console.log('Tournament updated:', tournament);
      // ゲーム中の場合は画面更新を無視
      if (this.isInGame) {
        console.log('Ignoring tournament update because player is in game');
        return;
      }
      this.tournament = tournament;
      this.render();
    });

    this.wsService.on('gameStart', (data: { gameId: string }) => {
      console.log('Tournament game starting for me:', data);
      // ゲーム中フラグを設定
      this.isInGame = true;
      // 自分の試合が始まったのでゲーム画面に遷移
      this.onGameStart(data.gameId);
    });

    this.wsService.on('tournamentMatchStart', (data: { gameId: string; matchId: string; round: number }) => {
      console.log('Tournament match starting:', data);

      // 自分が参加している試合か確認
      if (this.tournament) {
        const match = this.tournament.matches.find(m => m.id === data.matchId);
        if (match && (match.player1Id === this.currentUser.id || match.player2Id === this.currentUser.id)) {
          console.log('My tournament match is starting! Transitioning to game...');
          // 自分の試合の場合のみゲーム画面に遷移
          this.onGameStart(data.gameId);
        } else {
          console.log('Other players match started, staying on tournament screen');
          // 他の人の試合の場合はトーナメント画面を更新
          this.render();
        }
      }
    });

    this.wsService.on('tournamentCompleted', (data: { winnerId: string }) => {
      console.log('Tournament completed:', data);
      this.tournament = { ...this.tournament!, status: 'finished', winnerId: data.winnerId };
      this.render();

      // 3秒後に自動的にメイン画面に戻る
      setTimeout(() => {
        this.onExit();
      }, 3000);
    });

    this.wsService.on('tournamentLeft', () => {
      console.log('Left tournament');
      this.onExit();
    });
  }

  render(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black text-white">
        <div class="container mx-auto px-4 py-8">
          <div class="flex justify-between items-center mb-8">
            <h1 class="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              🏆 Tournament Mode
            </h1>
            <button id="back-btn" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors">
              Back to Menu
            </button>
          </div>

          ${this.renderContent()}
        </div>
      </div>
    `;

    this.setupButtonListeners();
  }

  // ゲーム終了後にトーナメント画面に戻る時に呼び出される
  returnFromGame(): void {
    console.log('Returning from game to tournament screen');
    this.isInGame = false;
    this.render();
  }

  private renderContent(): string {
    if (this.tournament) {
      return this.renderTournamentBracket();
    } else if (this.queuePosition) {
      return this.renderQueueStatus();
    } else {
      return this.renderJoinForm();
    }
  }

  private renderJoinForm(): string {
    return `
      <div class="max-w-2xl mx-auto text-center">
        <div class="bg-black bg-opacity-50 rounded-lg p-8 backdrop-blur-sm">
          <h2 class="text-2xl font-bold mb-4">Join Tournament</h2>
          <p class="text-gray-300 mb-6">
            4-player single elimination tournament.<br>
            Two semifinal matches, then a final match.<br>
            Winners advance automatically!
          </p>

          <div class="mb-8">
            <div class="inline-flex items-center space-x-4 text-lg">
              <span class="bg-blue-600 px-4 py-2 rounded">1st Match</span>
              <span class="text-yellow-400">vs</span>
              <span class="bg-blue-600 px-4 py-2 rounded">2nd Match</span>
              <span class="text-yellow-400">→</span>
              <span class="bg-yellow-600 px-4 py-2 rounded">Final</span>
            </div>
          </div>

          <button id="join-tournament" class="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-all transform hover:scale-105">
            Join Tournament Queue
          </button>
        </div>
      </div>
    `;
  }

  private renderQueueStatus(): string {
    const needed = 4 - this.queuePosition!;
    return `
      <div class="max-w-2xl mx-auto text-center">
        <div class="bg-black bg-opacity-50 rounded-lg p-8 backdrop-blur-sm">
          <div class="mb-6">
            <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <h2 class="text-2xl font-bold mb-2">Waiting for Players</h2>
            <p class="text-gray-300">You are #${this.queuePosition} in the queue</p>
          </div>

          <div class="mb-6">
            <div class="flex justify-center space-x-2 mb-4">
              ${Array.from({ length: 4 }, (_, i) => `
                <div class="w-16 h-16 rounded-full flex items-center justify-center ${
                  i < this.queuePosition! ? 'bg-green-600' : 'bg-gray-600'
                }">
                  ${i < this.queuePosition! ? '✓' : '?'}
                </div>
              `).join('')}
            </div>
            <p class="text-lg">Need ${needed} more player${needed !== 1 ? 's' : ''} to start</p>
          </div>

          <button id="leave-tournament" class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors">
            Leave Queue
          </button>
        </div>
      </div>
    `;
  }

  private renderTournamentBracket(): string {
    const semifinals = this.tournament!.matches.filter(m => m.round === 1);
    const final = this.tournament!.matches.find(m => m.round === 2);

    return `
      <div class="max-w-4xl mx-auto">
        <div class="bg-black bg-opacity-50 rounded-lg p-8 backdrop-blur-sm">
          <div class="text-center mb-8">
            <h2 class="text-3xl font-bold mb-2">Tournament Bracket</h2>
            <div class="inline-block px-4 py-2 rounded-lg ${this.getStatusColor(this.tournament!.status)}">
              ${this.getStatusText(this.tournament!.status)}
            </div>
            ${this.renderCurrentMatchInfo()}
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <!-- Semifinals -->
            <div class="space-y-6">
              <h3 class="text-xl font-bold text-center text-blue-400">Semifinals</h3>
              ${semifinals.map(match => this.renderMatch(match, 'Semifinal')).join('')}
            </div>

            <!-- Connector -->
            <div class="hidden lg:flex flex-col items-center justify-center h-full">
              <div class="w-full h-0.5 bg-yellow-500 mb-4"></div>
              <div class="text-yellow-400 text-2xl">VS</div>
              <div class="w-full h-0.5 bg-yellow-500 mt-4"></div>
            </div>

            <!-- Final -->
            <div>
              <h3 class="text-xl font-bold text-center text-yellow-400 mb-6">Final</h3>
              ${final ? this.renderMatch(final, 'Final') : this.renderPlaceholderMatch()}
            </div>
          </div>

          ${this.tournament!.status === 'finished' ? this.renderWinner() : ''}
        </div>
      </div>
    `;
  }

  private renderCurrentMatchInfo(): string {
    // 現在進行中の試合があるかチェック
    const playingMatch = this.tournament!.matches.find(m => m.status === 'playing');

    if (playingMatch) {
      const isMyMatch = playingMatch.player1Id === this.currentUser.id || playingMatch.player2Id === this.currentUser.id;
      const player1 = this.getPlayerName(playingMatch.player1Id);
      const player2 = this.getPlayerName(playingMatch.player2Id);

      // 自分の試合中の場合、この画面は表示されない（ゲーム画面に遷移済み）はずなので、
      // ここは他の人の試合観戦時のみ
      if (!isMyMatch) {
        return `
          <div class="mt-4 p-4 bg-blue-900 bg-opacity-50 rounded-lg">
            <p class="text-lg text-blue-200 font-semibold">🔴 Live Match</p>
            <p class="text-xl text-white">${player1} <span class="text-yellow-400">VS</span> ${player2}</p>
            <p class="text-sm text-blue-300 mt-1">
              ${playingMatch.round === 1 ? 'Semifinal' : 'Final'} ${playingMatch.matchNumber} in progress
            </p>
          </div>
        `;
      }
    }

    // 次の試合情報を表示
    const nextMatch = this.tournament!.matches.find(m => m.status === 'waiting');
    if (nextMatch) {
      const isMyNextMatch = nextMatch.player1Id === this.currentUser.id || nextMatch.player2Id === this.currentUser.id;
      if (isMyNextMatch) {
        return `
          <div class="mt-4 p-4 bg-green-900 bg-opacity-50 rounded-lg">
            <p class="text-green-200">⏳ Your next match</p>
            <p class="text-white">${this.getPlayerName(nextMatch.player1Id)} <span class="text-yellow-400">VS</span> ${this.getPlayerName(nextMatch.player2Id)}</p>
            <p class="text-sm text-green-300 mt-1">
              ${nextMatch.round === 1 ? 'Semifinal' : 'Final'} ${nextMatch.matchNumber} - Starting soon
            </p>
          </div>
        `;
      }
    }

    return '';
  }

  private renderMatch(match: TournamentMatch, title: string): string {
    const player1Name = this.getPlayerName(match.player1Id);
    const player2Name = this.getPlayerName(match.player2Id);
    const isCurrentUserMatch = match.player1Id === this.currentUser.id || match.player2Id === this.currentUser.id;

    return `
      <div class="bg-gray-800 rounded-lg p-4 ${isCurrentUserMatch ? 'ring-2 ring-yellow-500' : ''}">
        <div class="text-center text-sm text-gray-400 mb-2">${title} ${match.matchNumber}</div>

        <div class="space-y-2">
          <div class="flex items-center justify-between p-2 rounded ${
            match.winnerId === match.player1Id ? 'bg-green-600' : 'bg-gray-700'
          }">
            <span>${player1Name}</span>
            ${match.winnerId === match.player1Id ? '<span class="text-yellow-400">👑</span>' : ''}
          </div>

          <div class="text-center text-gray-400 text-sm">VS</div>

          <div class="flex items-center justify-between p-2 rounded ${
            match.winnerId === match.player2Id ? 'bg-green-600' : 'bg-gray-700'
          }">
            <span>${player2Name}</span>
            ${match.winnerId === match.player2Id ? '<span class="text-yellow-400">👑</span>' : ''}
          </div>
        </div>

        <div class="text-center mt-2">
          <span class="text-xs px-2 py-1 rounded ${this.getMatchStatusColor(match.status)}">
            ${this.getMatchStatusText(match.status)}
          </span>
        </div>
      </div>
    `;
  }

  private renderPlaceholderMatch(): string {
    return `
      <div class="bg-gray-800 rounded-lg p-4 opacity-50">
        <div class="text-center text-sm text-gray-400 mb-2">Final</div>
        <div class="space-y-2">
          <div class="p-2 bg-gray-700 rounded text-center">TBD</div>
          <div class="text-center text-gray-400 text-sm">VS</div>
          <div class="p-2 bg-gray-700 rounded text-center">TBD</div>
        </div>
      </div>
    `;
  }

  private renderWinner(): string {
    const winnerName = this.getPlayerName(this.tournament!.winnerId);
    return `
      <div class="mt-8 text-center">
        <div class="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-6">
          <h3 class="text-2xl font-bold mb-2">🏆 Tournament Champion! 🏆</h3>
          <p class="text-xl">${winnerName}</p>
        </div>
        <p class="mt-4 text-gray-400">Returning to menu in 3 seconds...</p>
      </div>
    `;
  }

  private getPlayerName(playerId?: string): string {
    if (!playerId) return 'TBD';
    if (playerId === this.currentUser.id) return 'You';
    return `Player ${playerId.slice(-4)}`;
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'waiting': return 'bg-gray-600';
      case 'semifinal': return 'bg-blue-600';
      case 'final': return 'bg-yellow-600';
      case 'finished': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'waiting': return 'Waiting to Start';
      case 'semifinal': return 'Semifinals in Progress';
      case 'final': return 'Final Match';
      case 'finished': return 'Tournament Complete';
      default: return 'Unknown';
    }
  }

  private getMatchStatusColor(status: string): string {
    switch (status) {
      case 'waiting': return 'bg-yellow-600';
      case 'playing': return 'bg-green-600';
      case 'finished': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  }

  private getMatchStatusText(status: string): string {
    switch (status) {
      case 'waiting': return 'Waiting';
      case 'playing': return 'Playing';
      case 'finished': return 'Finished';
      default: return 'Unknown';
    }
  }

  private setupButtonListeners(): void {
    const joinBtn = document.getElementById('join-tournament');
    if (joinBtn) {
      joinBtn.addEventListener('click', () => {
        console.log('Joining tournament...');
        this.wsService.send('joinTournament', {});
      });
    }

    const leaveBtn = document.getElementById('leave-tournament');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => {
        console.log('Leaving tournament...');
        this.wsService.send('leaveTournament', {});
      });
    }

    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (this.queuePosition) {
          this.wsService.send('leaveTournament', {});
        }
        this.onExit();
      });
    }
  }

  dispose(): void {
    this.wsService.off('tournamentStart');
    this.wsService.off('tournamentQueue');
    this.wsService.off('tournamentUpdate');
    this.wsService.off('gameStart');
    this.wsService.off('tournamentMatchStart');
    this.wsService.off('tournamentCompleted');
    this.wsService.off('tournamentLeft');
  }
}