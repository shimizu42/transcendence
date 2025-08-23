import './styles.css'
import { SPA } from './spa/spa'
import { GameManager } from './game/gameManager'
import { TournamentManager } from './tournament/tournamentManager'

class App {
  private spa: SPA
  private gameManager: GameManager
  private tournamentManager: TournamentManager
  private ws: WebSocket | null = null
  private playerId: string | null = null
  private playerName: string | null = null

  constructor() {
    this.spa = new SPA()
    this.gameManager = new GameManager()
    this.tournamentManager = new TournamentManager()
    this.init()
  }

  private init() {
    this.setupRoutes()
    this.spa.init()
    this.connectWebSocket()
  }

  private setupRoutes() {
    this.spa.addRoute('/', () => this.renderHome())
    this.spa.addRoute('/register', () => this.renderRegister())
    this.spa.addRoute('/tournaments', () => this.renderTournaments())
    this.spa.addRoute('/tournament/:id', (params) => this.renderTournament(params.id))
    this.spa.addRoute('/game/:id', (params) => this.renderGame(params.id))
  }

  private connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = '3000'  // Always connect directly to backend for WebSocket
    
    this.ws = new WebSocket(`${protocol}//${host}:${port}/ws`)
    
    this.ws.onopen = () => {
      console.log('WebSocket connected')
    }
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      this.handleWebSocketMessage(data)
    }
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      // Attempt to reconnect after 3 seconds
      setTimeout(() => this.connectWebSocket(), 3000)
    }
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  private handleWebSocketMessage(data: any) {
    switch (data.type) {
      case 'player_registered':
        this.playerId = data.player.id
        this.playerName = data.player.name
        console.log('Player registered:', data.player)
        
        // Show success message and redirect
        setTimeout(() => {
          alert(`プレイヤー登録完了: ${data.player.name}`)
          this.navigateTo('/tournaments')
        }, 500)
        break
      case 'tournament_update':
        console.log('Tournament update received:', data.tournament)
        this.tournamentManager.updateTournament(data.tournament)
        
        // Re-enable join button if needed
        const joinButtons = document.querySelectorAll('button[onclick*="joinTournament"]')
        joinButtons.forEach(button => {
          button.removeAttribute('disabled')
          button.textContent = '参加'
        })
        break
      case 'game_update':
        console.log('Game update received:', data.game)
        this.gameManager.updateGame(data.game)
        break
      case 'error':
        console.error('WebSocket error:', data.message)
        alert(data.message)
        
        // Re-enable buttons on error
        const buttons = document.querySelectorAll('button[disabled]')
        buttons.forEach(button => {
          button.removeAttribute('disabled')
          if (button.textContent?.includes('中...')) {
            button.textContent = button.textContent.replace('中...', '')
          }
        })
        break
    }
  }

  private renderHome(): string {
    return `
      <div class="game-container">
        <div class="text-center">
          <h1 class="text-6xl font-bold mb-8 text-neon-cyan">TRANSCENDENCE</h1>
          <p class="text-xl mb-8 text-gray-300">マルチプレイヤーPongトーナメント</p>
          <div class="space-y-4">
            <button onclick="app.navigateTo('/register')" class="btn btn-primary block mx-auto">
              ゲーム参加
            </button>
            <button onclick="app.navigateTo('/tournaments')" class="btn btn-secondary block mx-auto">
              トーナメント一覧
            </button>
          </div>
        </div>
      </div>
    `
  }

  private renderRegister(): string {
    return `
      <div class="game-container">
        <div class="max-w-md mx-auto">
          <h2 class="text-3xl font-bold mb-6 text-center text-neon-cyan">プレイヤー登録</h2>
          <form id="register-form" class="space-y-4">
            <div>
              <label for="playerName" class="block text-sm font-medium mb-2">プレイヤー名（別名）</label>
              <input 
                type="text" 
                id="playerName" 
                name="playerName" 
                required 
                class="w-full px-3 py-2 bg-game-text border border-neon-blue rounded-lg focus:outline-none focus:border-neon-cyan text-white"
                placeholder="あなたの別名を入力"
              >
            </div>
            <button type="submit" class="btn btn-primary w-full">登録</button>
          </form>
        </div>
      </div>
    `
  }

  private renderTournaments(): string {
    // Load tournaments when rendering the page
    setTimeout(() => this.tournamentManager.loadTournaments(), 100)
    
    return `
      <div class="game-container">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-3xl font-bold text-neon-cyan">トーナメント一覧</h2>
          <button onclick="app.createTournament()" class="btn btn-primary">新しいトーナメント作成</button>
        </div>
        <div id="tournaments-list" class="space-y-4">
          <!-- Tournament list will be populated here -->
        </div>
      </div>
    `
  }

  private renderTournament(id: string): string {
    // Load tournament details when rendering
    setTimeout(() => this.loadTournamentDetails(id), 100)
    
    return `
      <div class="game-container">
        <div id="tournament-detail">
          <div class="text-center mb-6">
            <h2 class="text-3xl font-bold text-neon-cyan mb-4">トーナメント</h2>
            ${this.playerId ? `
              <button onclick="app.joinTournament('${id}')" class="btn btn-primary mr-4">参加</button>
              <button onclick="app.startTournament('${id}')" class="btn btn-secondary">開始</button>
            ` : `
              <div class="bg-yellow-900 border border-yellow-500 rounded-lg p-4 mb-4">
                <p class="text-yellow-200">トーナメントに参加するにはプレイヤー登録が必要です</p>
                <button onclick="app.navigateTo('/register')" class="btn btn-primary mt-2">プレイヤー登録</button>
              </div>
            `}
          </div>
          <div id="tournament-content">
            <div class="text-center text-gray-400">読み込み中...</div>
          </div>
        </div>
      </div>
    `
  }

  private renderGame(id: string): string {
    return `
      <div class="game-fullscreen">
        <div class="game-ui-overlay">
          <div class="game-header">
            <h2 class="text-2xl font-bold text-neon-cyan">ゲーム - マッチ ${id.substring(0, 8)}</h2>
            <div id="game-info" class="mb-2">
              <p class="text-gray-300">ゲーム待機中...</p>
            </div>
          </div>
          <div class="game-controls">
            <button id="ready-btn" onclick="window.app.readyPlayer('${id}')" class="btn btn-primary btn-sm">準備完了</button>
            <button onclick="window.app.navigateTo('/tournaments')" class="btn btn-secondary btn-sm ml-2">トーナメントに戻る</button>
          </div>
          <div id="game-instructions" class="game-instructions">
            <p class="text-xs text-gray-400">上下矢印キーまたはW/Sキーでパドルを操作</p>
            <p class="text-xs text-neon-cyan">3Dモード - マウスでカメラ操作可能</p>
          </div>
        </div>
        <canvas id="game-canvas" class="game-canvas-fullscreen"></canvas>
      </div>
    `
  }

  // Public methods for UI interactions
  public navigateTo(path: string) {
    this.spa.navigateTo(path)
  }

  public registerPlayer(name: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'register_player',
        name: name
      }))
    }
  }

  public async createTournament() {
    if (!this.playerId) {
      alert('プレイヤー登録が必要です')
      this.navigateTo('/register')
      return
    }

    const name = prompt('トーナメント名を入力してください:')
    if (name) {
      try {
        const apiUrl = '/api/tournaments'
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const tournament = await response.json()
        this.navigateTo(`/tournament/${tournament.id}`)
      } catch (error) {
        console.error('Failed to create tournament:', error)
        alert('トーナメント作成に失敗しました')
      }
    }
  }

  public joinTournament(tournamentId: string) {
    if (!this.playerId) {
      alert('プレイヤー登録が必要です')
      this.navigateTo('/register')
      return
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'join_tournament',
        tournamentId
      }))
      
      // Show feedback
      const button = document.querySelector(`button[onclick="app.joinTournament('${tournamentId}')"]`)
      if (button) {
        button.textContent = '参加中...'
        button.setAttribute('disabled', 'true')
      }
    } else {
      alert('サーバーとの接続が確立されていません')
    }
  }

  public startTournament(tournamentId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'start_tournament',
        tournamentId
      }))
    }
  }

  public joinGame(gameId: string) {
    if (!this.playerId) {
      alert('プレイヤー登録が必要です')
      this.navigateTo('/register')
      return
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`Joining game: ${gameId}`)
      this.ws.send(JSON.stringify({
        type: 'join_game',
        matchId: gameId
      }))
      
      // Navigate to game screen
      this.navigateTo(`/game/${gameId}`)
    } else {
      alert('サーバーとの接続が確立されていません')
    }
  }

  public readyPlayer(gameId: string) {
    console.log(`Ready player for game: ${gameId}`)
    
    if (!this.playerId) {
      alert('プレイヤー登録が必要です')
      return
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'player_ready',
        gameId
      }))
      
      // Update button state
      const button = document.getElementById('ready-btn')
      if (button) {
        button.textContent = '準備中...'
        button.setAttribute('disabled', 'true')
      }
    } else {
      alert('サーバーとの接続が確立されていません')
    }
  }

  public sendPlayerMove(gameId: string, position: { x: number, y: number }) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'player_move',
        gameId,
        position
      }))
    }
  }

  public getPlayerId(): string | null {
    return this.playerId
  }

  private async loadTournamentDetails(id: string) {
    try {
      const apiUrl = `/api/tournaments/${id}`
      
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const tournament = await response.json()
      this.tournamentManager.updateTournament(tournament)
    } catch (error) {
      console.error('Failed to load tournament details:', error)
      const content = document.getElementById('tournament-content')
      if (content) {
        content.innerHTML = `
          <div class="text-center text-red-400 py-8">
            <p>トーナメント詳細の読み込みに失敗しました</p>
            <button onclick="app.navigateTo('/tournaments')" class="btn btn-primary mt-4">
              トーナメント一覧に戻る
            </button>
          </div>
        `
      }
    }
  }
}

// Initialize the app
const app = new App()

// Make app globally available for UI interactions
declare global {
  interface Window {
    app: App
  }
}
window.app = app

// Handle form submissions
document.addEventListener('submit', (e) => {
  if (e.target && (e.target as HTMLElement).id === 'register-form') {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    const playerName = formData.get('playerName') as string
    
    if (playerName.trim()) {
      app.registerPlayer(playerName.trim())
    } else {
      alert('プレイヤー名を入力してください')
    }
  }
})