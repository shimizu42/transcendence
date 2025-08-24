export class TournamentManager {
  private currentTournament: any = null

  public updateTournament(tournament: any) {
    this.currentTournament = tournament
    this.renderTournamentContent()
  }

  private renderTournamentContent() {
    const tournamentContent = document.getElementById('tournament-content')
    if (!tournamentContent || !this.currentTournament) return

    let html = `
      <div class="mb-6">
        <h3 class="text-2xl font-bold mb-4">${this.currentTournament.name}</h3>
        <p class="text-lg">ゲームタイプ: <span class="text-neon-cyan">${this.getGameTypeText(this.currentTournament.gameType)}</span></p>
        <p class="text-lg">ステータス: <span class="text-neon-cyan">${this.getStatusText(this.currentTournament.status)}</span></p>
        <p class="text-lg">参加者数: <span class="text-neon-cyan">${this.currentTournament.players.length}</span></p>
      </div>
    `

    // Show players
    if (this.currentTournament.players.length > 0) {
      html += `
        <div class="mb-6">
          <h4 class="text-xl font-semibold mb-3">参加者</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            ${this.currentTournament.players.map((player: any) => `
              <div class="player-card">
                <span class="font-medium">${player.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `
    }

    // Show matches
    if (this.currentTournament.matches.length > 0) {
      html += `
        <div class="mb-6">
          <h4 class="text-xl font-semibold mb-3">対戦表 - ラウンド ${this.currentTournament.currentRound}</h4>
          <div class="space-y-4">
            ${this.currentTournament.matches.map((match: any) => this.renderMatch(match)).join('')}
          </div>
        </div>
      `
    }

    // Show tournament brackets if tournament has started
    if (this.currentTournament.status === 'playing' && this.currentTournament.matches.length > 0) {
      html += this.renderTournamentBracket()
    }

    tournamentContent.innerHTML = html
  }

  private renderMatch(match: any): string {
    const getStatusClass = (status: string) => {
      switch (status) {
        case 'pending': return 'border-yellow-500 bg-yellow-900'
        case 'playing': return 'border-green-500 bg-green-900'
        case 'finished': return 'border-blue-500 bg-blue-900'
        default: return 'border-gray-500 bg-gray-900'
      }
    }

    const getStatusText = (status: string) => {
      switch (status) {
        case 'pending': return '待機中'
        case 'playing': return 'プレイ中'
        case 'finished': return '終了'
        default: return status
      }
    }

    return `
      <div class="match-card ${getStatusClass(match.status)}">
        <div class="flex justify-between items-center">
          <div class="flex-1">
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold">${match.player1.name}</span>
              <span class="text-sm px-2 py-1 rounded ${getStatusClass(match.status)}">
                ${getStatusText(match.status)}
              </span>
            </div>
            <div class="text-center my-2 text-lg font-bold text-neon-cyan">VS</div>
            <div class="flex items-center justify-between">
              <span class="font-semibold">${match.player2.name}</span>
              ${match.winner ? `<span class="text-sm text-green-400">勝者: ${match.winner.name}</span>` : ''}
            </div>
          </div>
          <div class="ml-4">
            ${match.status === 'pending' ? `
              <button onclick="window.app.joinGame('${match.id}')" class="btn btn-primary text-sm px-4 py-2">
                ゲーム参加
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `
  }

  private renderTournamentBracket(): string {
    const rounds = this.organizeBrackets()
    
    let html = `
      <div class="mb-6">
        <h4 class="text-xl font-semibold mb-3">トーナメントブラケット</h4>
        <div class="tournament-bracket">
    `

    rounds.forEach((round, roundIndex) => {
      html += `
        <div class="round mb-6">
          <h5 class="text-lg font-semibold mb-3 text-neon-cyan">ラウンド ${roundIndex + 1}</h5>
          <div class="matches space-y-2">
            ${round.map(match => `
              <div class="match bg-neon-blue p-2 rounded">
                <div class="text-sm">
                  ${match.player1.name} vs ${match.player2.name}
                  ${match.winner ? `<span class="text-green-400 ml-2">(勝者: ${match.winner.name})</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `
    })

    html += `
        </div>
      </div>
    `

    return html
  }

  private organizeBrackets(): any[][] {
    if (!this.currentTournament.matches) return []

    // Simple bracket organization - group by rounds
    const rounds: any[][] = []
    let currentRoundMatches = [...this.currentTournament.matches]

    while (currentRoundMatches.length > 0) {
      rounds.push([...currentRoundMatches])
      
      // For next round, create matches from winners
      const winners = currentRoundMatches
        .filter(match => match.winner)
        .map(match => match.winner)

      if (winners.length < 2) break

      currentRoundMatches = []
      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          currentRoundMatches.push({
            id: `round-${rounds.length}-match-${i/2}`,
            player1: winners[i],
            player2: winners[i + 1],
            status: 'pending'
          })
        }
      }
    }

    return rounds
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'registration': return '登録受付中'
      case 'playing': return 'プレイ中'
      case 'finished': return '終了'
      default: return status
    }
  }

  private getGameTypeText(gameType: string): string {
    switch (gameType) {
      case 'pong': return '3D Pong'
      case 'tank': return '3D Tank Battle'
      default: return gameType || '3D Pong'
    }
  }

  public async loadTournaments() {
    try {
      const apiUrl = '/api/tournaments'
      
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const tournaments = await response.json()
      this.renderTournamentsList(tournaments)
    } catch (error) {
      console.error('Failed to load tournaments:', error)
      const tournamentsList = document.getElementById('tournaments-list')
      if (tournamentsList) {
        tournamentsList.innerHTML = `
          <div class="text-center text-red-400 py-8">
            <p>トーナメントの読み込みに失敗しました</p>
            <p class="text-sm text-gray-500">サーバーとの接続を確認してください</p>
          </div>
        `
      }
    }
  }

  private renderTournamentsList(tournaments: any[]) {
    const tournamentsList = document.getElementById('tournaments-list')
    if (!tournamentsList) return

    if (tournaments.length === 0) {
      tournamentsList.innerHTML = `
        <div class="text-center text-gray-400 py-8">
          <p>まだトーナメントがありません。</p>
          <p>新しいトーナメントを作成してください。</p>
        </div>
      `
      return
    }

    const html = tournaments.map(tournament => `
      <div class="match-card">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-lg font-semibold">${tournament.name}</h3>
            <p class="text-sm text-gray-400">
              ${this.getGameTypeText(tournament.gameType)} | 
              ステータス: ${this.getStatusText(tournament.status)} | 
              参加者: ${tournament.players.length}人
            </p>
          </div>
          <div class="space-x-2">
            <button onclick="app.navigateTo('/tournament/${tournament.id}')" class="btn btn-primary text-sm">
              詳細を見る
            </button>
          </div>
        </div>
      </div>
    `).join('')

    tournamentsList.innerHTML = html
  }
}