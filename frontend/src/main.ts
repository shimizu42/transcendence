import './styles.css'
import { SPA } from './spa/spa'
import { GameManager } from './game/gameManager'
import { TournamentManager } from './tournament/tournamentManager'
import { AuthManager } from './auth/authManager'

class App {
  private spa: SPA
  private gameManager: GameManager
  private tournamentManager: TournamentManager
  private authManager: AuthManager
  private ws: WebSocket | null = null
  private playerId: string | null = null
  private playerName: string | null = null

  constructor() {
    this.spa = new SPA()
    this.gameManager = new GameManager()
    this.tournamentManager = new TournamentManager()
    this.authManager = new AuthManager()
    
    // Listen for user-loaded event to re-render when user info is available
    window.addEventListener('user-loaded', () => {
      this.spa.navigateTo(window.location.pathname)
    })
    
    this.init()
  }

  private init() {
    this.setupRoutes()
    this.spa.init()
    this.connectWebSocket()
  }

  private setupRoutes() {
    this.spa.addRoute('/', () => this.renderHome())
    this.spa.addRoute('/login', () => this.renderLogin())
    this.spa.addRoute('/register', () => this.renderRegister())
    this.spa.addRoute('/signup', () => this.renderSignup())
    this.spa.addRoute('/profile', () => this.renderProfile())
    this.spa.addRoute('/friends', () => this.renderFriends())
    this.spa.addRoute('/stats', () => this.renderStats())
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
    const isAuthenticated = this.authManager.isAuthenticated()
    const currentUser = this.authManager.getCurrentUser()

    if (isAuthenticated) {
      if (!currentUser) {
        // User info is still loading
        return `
          <div class="game-container">
            <div class="text-center text-white">
              <p>ユーザー情報を読み込み中...</p>
            </div>
          </div>
        `
      }
      return `
        <div class="game-container">
          <nav class="mb-8">
            <div class="flex justify-between items-center p-4 bg-game-bg border-b border-neon-blue">
              <h1 class="text-2xl font-bold text-neon-cyan">TRANSCENDENCE</h1>
              <div class="flex items-center space-x-4">
                <img src="${currentUser.avatar || '/avatars/default1.svg'}" alt="Avatar" class="w-8 h-8 rounded-full">
                <span class="text-white">${currentUser.displayName}</span>
                <button onclick="app.logout()" class="btn btn-secondary btn-sm">ログアウト</button>
              </div>
            </div>
            <div class="flex space-x-4 p-4">
              <button onclick="app.navigateTo('/profile')" class="btn btn-secondary">プロフィール</button>
              <button onclick="app.navigateTo('/friends')" class="btn btn-secondary">友達</button>
              <button onclick="app.navigateTo('/stats')" class="btn btn-secondary">統計</button>
              <button onclick="app.navigateTo('/tournaments')" class="btn btn-primary">トーナメント</button>
            </div>
          </nav>
          <div class="text-center">
            <h2 class="text-4xl font-bold mb-4 text-white">ようこそ、${currentUser.displayName}!</h2>
            <div class="grid md:grid-cols-3 gap-6 mt-8">
              <div class="bg-game-text p-6 rounded-lg border border-neon-blue">
                <h3 class="text-xl font-bold text-neon-cyan mb-2">統計</h3>
                <p class="text-gray-300">勝利: ${currentUser.wins}</p>
                <p class="text-gray-300">敗北: ${currentUser.losses}</p>
                <p class="text-gray-300">総試合: ${currentUser.totalGames}</p>
              </div>
              <div class="bg-game-text p-6 rounded-lg border border-neon-blue">
                <h3 class="text-xl font-bold text-neon-cyan mb-2">オンライン状態</h3>
                <p class="text-green-400">オンライン</p>
              </div>
              <div class="bg-game-text p-6 rounded-lg border border-neon-blue">
                <h3 class="text-xl font-bold text-neon-cyan mb-2">クイックアクション</h3>
                <button onclick="app.navigateTo('/tournaments')" class="btn btn-primary btn-sm w-full">
                  ゲーム開始
                </button>
              </div>
            </div>
          </div>
        </div>
      `
    } else {
      return `
        <div class="game-container">
          <div class="text-center">
            <h1 class="text-6xl font-bold mb-8 text-neon-cyan">TRANSCENDENCE</h1>
            <p class="text-xl mb-8 text-gray-300">マルチプレイヤーPongトーナメント</p>
            <div class="space-y-4">
              <button onclick="app.navigateTo('/login')" class="btn btn-primary block mx-auto">
                ログイン
              </button>
              <button onclick="app.navigateTo('/signup')" class="btn btn-secondary block mx-auto">
                新規登録
              </button>
              <button onclick="app.navigateTo('/register')" class="btn btn-outline block mx-auto">
                ゲスト参加
              </button>
            </div>
          </div>
        </div>
      `
    }
  }

  private renderLogin(): string {
    return `
      <div class="game-container">
        <div class="max-w-md mx-auto">
          <h2 class="text-3xl font-bold mb-6 text-center text-neon-cyan">ログイン</h2>
          <form id="login-form" class="space-y-4">
            <div>
              <label for="username" class="block text-sm font-medium mb-2">ユーザー名</label>
              <input 
                type="text" 
                id="username" 
                name="username" 
                required 
                class="w-full px-3 py-2 bg-game-text border border-neon-blue rounded-lg focus:outline-none focus:border-neon-cyan text-white"
                placeholder="ユーザー名を入力"
              >
            </div>
            <div>
              <label for="password" class="block text-sm font-medium mb-2">パスワード</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                required 
                class="w-full px-3 py-2 bg-game-text border border-neon-blue rounded-lg focus:outline-none focus:border-neon-cyan text-white"
                placeholder="パスワード"
              >
            </div>
            <button type="submit" class="btn btn-primary w-full">ログイン</button>
          </form>
          <div class="text-center mt-4">
            <p class="text-gray-400">アカウントをお持ちでない場合</p>
            <button onclick="app.navigateTo('/signup')" class="btn btn-secondary mt-2">新規登録</button>
          </div>
        </div>
      </div>
    `
  }

  private renderSignup(): string {
    return `
      <div class="game-container">
        <div class="max-w-md mx-auto">
          <h2 class="text-3xl font-bold mb-6 text-center text-neon-cyan">新規登録</h2>
          <form id="signup-form" class="space-y-4">
            <div>
              <label for="username" class="block text-sm font-medium mb-2">ユーザー名</label>
              <input 
                type="text" 
                id="username" 
                name="username" 
                required 
                class="w-full px-3 py-2 bg-game-text border border-neon-blue rounded-lg focus:outline-none focus:border-neon-cyan text-white"
                placeholder="ユーザー名を入力"
              >
            </div>
            <div>
              <label for="password" class="block text-sm font-medium mb-2">パスワード</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                required 
                minlength="6"
                class="w-full px-3 py-2 bg-game-text border border-neon-blue rounded-lg focus:outline-none focus:border-neon-cyan text-white"
                placeholder="6文字以上のパスワード"
              >
            </div>
            <button type="submit" class="btn btn-primary w-full">登録</button>
          </form>
          <div class="text-center mt-4">
            <p class="text-gray-400">すでにアカウントをお持ちの場合</p>
            <button onclick="app.navigateTo('/login')" class="btn btn-secondary mt-2">ログイン</button>
          </div>
        </div>
      </div>
    `
  }

  private renderRegister(): string {
    return `
      <div class="game-container">
        <div class="max-w-md mx-auto">
          <h2 class="text-3xl font-bold mb-6 text-center text-neon-cyan">ゲスト参加</h2>
          <p class="text-gray-400 mb-4 text-center">ゲストとして一時的にゲームに参加できます</p>
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
            <button type="submit" class="btn btn-primary w-full">ゲスト登録</button>
          </form>
          <div class="text-center mt-4">
            <p class="text-gray-400">統計や友達機能をご利用いただくには</p>
            <button onclick="app.navigateTo('/signup')" class="btn btn-secondary mt-2">アカウント登録</button>
          </div>
        </div>
      </div>
    `
  }

  private renderProfile(): string {
    const user = this.authManager.getCurrentUser()
    if (!user) {
      return this.redirectToLogin()
    }

    // Load default avatars
    setTimeout(() => this.loadAvatarOptions(), 100)

    return `
      <div class="game-container">
        <div class="max-w-2xl mx-auto">
          <h2 class="text-3xl font-bold mb-6 text-center text-neon-cyan">プロフィール</h2>
          
          <div class="bg-game-text p-6 rounded-lg border border-neon-blue mb-6">
            <div class="flex items-center space-x-4 mb-4">
              <img src="${user.avatar || '/avatars/default1.svg'}" alt="Avatar" class="w-16 h-16 rounded-full">
              <div>
                <h3 class="text-xl font-bold text-white">${user.displayName}</h3>
                <p class="text-gray-400">@${user.username}</p>
              </div>
            </div>
          </div>

          <form id="profile-form" class="space-y-4 mb-6">
            <div>
              <label for="displayName" class="block text-sm font-medium mb-2">表示名</label>
              <input 
                type="text" 
                id="displayName" 
                name="displayName" 
                value="${user.displayName}"
                class="w-full px-3 py-2 bg-game-text border border-neon-blue rounded-lg focus:outline-none focus:border-neon-cyan text-white"
              >
            </div>
            <button type="submit" class="btn btn-primary">更新</button>
          </form>

          <div class="bg-game-text p-6 rounded-lg border border-neon-blue">
            <h3 class="text-xl font-bold text-neon-cyan mb-4">アバターを選択</h3>
            <div id="avatar-options" class="grid grid-cols-5 gap-4">
              <!-- Avatar options will be loaded here -->
            </div>
          </div>

          <div class="text-center mt-6">
            <button onclick="app.navigateTo('/')" class="btn btn-secondary">戻る</button>
          </div>
        </div>
      </div>
    `
  }

  private renderFriends(): string {
    const user = this.authManager.getCurrentUser()
    if (!user) {
      return this.redirectToLogin()
    }

    // Load friends list
    setTimeout(() => this.loadFriends(), 100)

    return `
      <div class="game-container">
        <div class="max-w-4xl mx-auto">
          <h2 class="text-3xl font-bold mb-6 text-center text-neon-cyan">友達</h2>
          
          <div class="mb-6">
            <div class="flex space-x-4">
              <input 
                type="text" 
                id="search-users" 
                placeholder="ユーザーを検索..."
                class="flex-1 px-3 py-2 bg-game-text border border-neon-blue rounded-lg focus:outline-none focus:border-neon-cyan text-white"
              >
              <button onclick="app.searchUsers()" class="btn btn-primary">検索</button>
            </div>
          </div>

          <div id="search-results" class="mb-6 hidden">
            <h3 class="text-xl font-bold text-neon-cyan mb-4">検索結果</h3>
            <div id="search-results-list">
              <!-- Search results will be displayed here -->
            </div>
          </div>

          <div>
            <h3 class="text-xl font-bold text-neon-cyan mb-4">友達リスト</h3>
            <div id="friends-list">
              <div class="text-center text-gray-400">読み込み中...</div>
            </div>
          </div>

          <div class="text-center mt-6">
            <button onclick="app.navigateTo('/')" class="btn btn-secondary">戻る</button>
          </div>
        </div>
      </div>
    `
  }

  private renderStats(): string {
    const user = this.authManager.getCurrentUser()
    if (!user) {
      return this.redirectToLogin()
    }

    // Load detailed stats and match history
    setTimeout(() => this.loadStatsAndHistory(), 100)

    return `
      <div class="game-container">
        <div class="max-w-4xl mx-auto">
          <h2 class="text-3xl font-bold mb-6 text-center text-neon-cyan">統計・履歴</h2>
          
          <div class="grid md:grid-cols-2 gap-6 mb-6">
            <div class="bg-game-text p-6 rounded-lg border border-neon-blue">
              <h3 class="text-xl font-bold text-neon-cyan mb-4">統計</h3>
              <div id="detailed-stats">
                <div class="space-y-2">
                  <p class="text-gray-300">勝利: ${user.wins}</p>
                  <p class="text-gray-300">敗北: ${user.losses}</p>
                  <p class="text-gray-300">総試合: ${user.totalGames}</p>
                  <p class="text-gray-300">勝率: ${user.totalGames > 0 ? Math.round((user.wins / user.totalGames) * 100) : 0}%</p>
                </div>
              </div>
            </div>
            
            <div class="bg-game-text p-6 rounded-lg border border-neon-blue">
              <h3 class="text-xl font-bold text-neon-cyan mb-4">アカウント情報</h3>
              <div class="space-y-2">
                <p class="text-gray-300">表示名: ${user.displayName}</p>
                <p class="text-gray-300">ユーザー名: @${user.username}</p>
                <p class="text-gray-300">ステータス: <span class="text-green-400">オンライン</span></p>
              </div>
            </div>
          </div>

          <div class="bg-game-text p-6 rounded-lg border border-neon-blue">
            <h3 class="text-xl font-bold text-neon-cyan mb-4">マッチ履歴</h3>
            <div id="match-history">
              <div class="text-center text-gray-400">読み込み中...</div>
            </div>
          </div>

          <div class="text-center mt-6">
            <button onclick="app.navigateTo('/')" class="btn btn-secondary">戻る</button>
          </div>
        </div>
      </div>
    `
  }

  private redirectToLogin(): string {
    setTimeout(() => this.navigateTo('/login'), 100)
    return `
      <div class="game-container">
        <div class="text-center">
          <p class="text-gray-400">ログインが必要です...</p>
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
            ${this.authManager.isAuthenticated() ? `
              <button onclick="app.joinTournament('${id}')" class="btn btn-primary mr-4">参加</button>
              <button onclick="app.startTournament('${id}')" class="btn btn-secondary">開始</button>
            ` : `
              <div class="bg-yellow-900 border border-yellow-500 rounded-lg p-4 mb-4">
                <p class="text-yellow-200">トーナメントに参加するにはログインが必要です</p>
                <button onclick="app.navigateTo('/login')" class="btn btn-primary mt-2">ログイン</button>
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
    const currentUser = this.authManager.getCurrentUser()
    if (!currentUser) {
      alert('ログインが必要です')
      this.navigateTo('/login')
      return
    }

    const name = prompt('トーナメント名を入力してください:')
    if (name) {
      try {
        const apiUrl = '/api/tournaments'
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authManager.getToken()}`
          },
          body: JSON.stringify({ 
            name,
            creatorId: currentUser.id,
            creatorName: currentUser.displayName
          })
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
    const currentUser = this.authManager.getCurrentUser()
    if (!currentUser) {
      alert('ログインが必要です')
      this.navigateTo('/login')
      return
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'join_tournament',
        tournamentId,
        playerId: currentUser.id,
        playerName: currentUser.displayName
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
    const currentUser = this.authManager.getCurrentUser()
    if (!currentUser) {
      alert('ログインが必要です')
      this.navigateTo('/login')
      return
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`Joining game: ${gameId}`)
      this.ws.send(JSON.stringify({
        type: 'join_game',
        matchId: gameId,
        playerId: currentUser.id,
        playerName: currentUser.displayName
      }))
      
      // Navigate to game screen
      this.navigateTo(`/game/${gameId}`)
    } else {
      alert('サーバーとの接続が確立されていません')
    }
  }

  public readyPlayer(gameId: string) {
    console.log(`Ready player for game: ${gameId}`)
    
    const currentUser = this.authManager.getCurrentUser()
    if (!currentUser) {
      alert('ログインが必要です')
      return
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'player_ready',
        gameId,
        playerId: currentUser.id,
        playerName: currentUser.displayName
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
    const currentUser = this.authManager.getCurrentUser()
    if (this.ws && this.ws.readyState === WebSocket.OPEN && currentUser) {
      this.ws.send(JSON.stringify({
        type: 'player_move',
        gameId,
        playerId: currentUser.id,
        playerName: currentUser.displayName,
        position
      }))
    }
  }

  public getPlayerId(): string | null {
    const currentUser = this.authManager.getCurrentUser()
    return currentUser ? currentUser.id : null
  }
  
  public getCurrentUserId(): string | null {
    const currentUser = this.authManager.getCurrentUser()
    return currentUser ? currentUser.id : null
  }

  // Authentication methods
  public async login(username: string, password: string) {
    try {
      const result = await this.authManager.login(username, password)
      alert(`ログイン成功: ${result.user.displayName}`)
      window.location.href = '/'
    } catch (error: any) {
      alert(`ログインエラー: ${error.message}`)
    }
  }

  public async signup(username: string, password: string) {
    try {
      const result = await this.authManager.register({ 
        username, 
        displayName: username, 
        password 
      })
      alert(`登録成功: ${result.user.displayName}`)
      window.location.href = '/'
    } catch (error: any) {
      alert(`登録エラー: ${error.message}`)
    }
  }

  public logout() {
    this.authManager.logout()
    alert('ログアウトしました')
    this.navigateTo('/')
  }

  // Profile management methods
  public async updateProfile(displayName: string) {
    try {
      await this.authManager.updateProfile({ displayName })
      alert('プロフィールを更新しました')
      this.navigateTo('/')
    } catch (error: any) {
      alert(`更新エラー: ${error.message}`)
    }
  }

  public async setAvatar(avatarUrl: string) {
    try {
      await this.authManager.setAvatar(avatarUrl)
      alert('アバターを更新しました')
      // Refresh the page to show the new avatar
      this.navigateTo('/profile')
    } catch (error: any) {
      alert(`アバター更新エラー: ${error.message}`)
    }
  }

  public async loadAvatarOptions() {
    try {
      const avatars = await this.authManager.getDefaultAvatars()
      const container = document.getElementById('avatar-options')
      if (container) {
        container.innerHTML = avatars.map(avatar => 
          `<button onclick="app.setAvatar('${avatar}')" class="avatar-option">
            <img src="${avatar}" alt="Avatar" class="w-12 h-12 rounded-full border-2 border-neon-blue hover:border-neon-cyan">
           </button>`
        ).join('')
      }
    } catch (error: any) {
      console.error('Failed to load avatars:', error.message)
    }
  }

  // Friends management methods
  public async searchUsers() {
    const input = document.getElementById('search-users') as HTMLInputElement
    if (!input || !input.value.trim()) return

    try {
      const users = await this.authManager.searchUsers(input.value.trim())
      const resultsContainer = document.getElementById('search-results')
      const resultsList = document.getElementById('search-results-list')
      
      if (resultsContainer && resultsList) {
        resultsContainer.classList.remove('hidden')
        console.log('Search results:', users)
        resultsList.innerHTML = users.map(user => {
          console.log(`Creating button for user: ${user.id} (${user.displayName})`)
          return `<div class="flex items-center justify-between p-4 bg-game-bg rounded-lg border border-neon-blue mb-2">
            <div class="flex items-center space-x-4">
              <img src="${user.avatar || '/avatars/default1.svg'}" alt="Avatar" class="w-10 h-10 rounded-full">
              <div>
                <p class="font-bold text-white">${user.displayName}</p>
                <p class="text-gray-400">@${user.username}</p>
                <p class="text-sm ${user.isOnline ? 'text-green-400' : 'text-gray-500'}">${user.isOnline ? 'オンライン' : 'オフライン'}</p>
              </div>
            </div>
            <button onclick="app.addFriend('${user.id}')" class="btn btn-primary btn-sm">友達追加</button>
          </div>`
        }).join('')
        
        if (users.length === 0) {
          resultsList.innerHTML = '<p class="text-center text-gray-400">ユーザーが見つかりませんでした</p>'
        }
      }
    } catch (error: any) {
      alert(`検索エラー: ${error.message}`)
    }
  }

  public async addFriend(friendId: string) {
    try {
      console.log(`Attempting to add friend: ${friendId}`)
      const currentUser = this.authManager.getCurrentUser()
      console.log(`Current user: ${currentUser?.id}`)
      
      await this.authManager.addFriend(friendId)
      alert('友達を追加しました')
      this.loadFriends() // Refresh friends list
    } catch (error: any) {
      console.error('Friend addition error:', error)
      alert(`友達追加エラー: ${error.message}`)
    }
  }

  public async removeFriend(friendId: string) {
    if (confirm('本当にこの友達を削除しますか？')) {
      try {
        await this.authManager.removeFriend(friendId)
        alert('友達を削除しました')
        this.loadFriends() // Refresh friends list
      } catch (error: any) {
        alert(`友達削除エラー: ${error.message}`)
      }
    }
  }

  public async loadFriends() {
    try {
      const friends = await this.authManager.getFriends()
      const friendsList = document.getElementById('friends-list')
      
      if (friendsList) {
        if (friends.length === 0) {
          friendsList.innerHTML = '<p class="text-center text-gray-400">まだ友達がいません</p>'
        } else {
          friendsList.innerHTML = friends.map(friend => 
            `<div class="flex items-center justify-between p-4 bg-game-bg rounded-lg border border-neon-blue mb-2">
              <div class="flex items-center space-x-4">
                <img src="${friend.avatar || '/avatars/default1.svg'}" alt="Avatar" class="w-10 h-10 rounded-full">
                <div>
                  <p class="font-bold text-white">${friend.displayName}</p>
                  <p class="text-gray-400">@${friend.username}</p>
                  <p class="text-sm ${friend.isOnline ? 'text-green-400' : 'text-gray-500'}">${friend.isOnline ? 'オンライン' : 'オフライン'}</p>
                </div>
              </div>
              <div class="space-x-2">
                <button onclick="app.viewUserStats('${friend.id}')" class="btn btn-secondary btn-sm">統計表示</button>
                <button onclick="app.removeFriend('${friend.id}')" class="btn btn-danger btn-sm">削除</button>
              </div>
            </div>`
          ).join('')
        }
      }
    } catch (error: any) {
      const friendsList = document.getElementById('friends-list')
      if (friendsList) {
        friendsList.innerHTML = '<p class="text-center text-red-400">友達リスト読み込みエラー</p>'
      }
    }
  }

  // Stats and history methods
  public async loadStatsAndHistory() {
    try {
      const [stats, matches] = await Promise.all([
        this.authManager.getStats(),
        this.authManager.getMatchHistory()
      ])

      // Update detailed stats
      const detailedStats = document.getElementById('detailed-stats')
      if (detailedStats) {
        detailedStats.innerHTML = `
          <div class="space-y-2">
            <p class="text-gray-300">勝利: ${stats.wins}</p>
            <p class="text-gray-300">敗北: ${stats.losses}</p>
            <p class="text-gray-300">総試合: ${stats.totalGames}</p>
            <p class="text-gray-300">勝率: ${stats.winRate}%</p>
          </div>
        `
      }

      // Update match history
      const matchHistory = document.getElementById('match-history')
      if (matchHistory) {
        if (matches.length === 0) {
          matchHistory.innerHTML = '<p class="text-center text-gray-400">まだ試合履歴がありません</p>'
        } else {
          matchHistory.innerHTML = `
            <div class="space-y-2 max-h-96 overflow-y-auto">
              ${matches.map(match => {
                const playedAt = new Date(match.playedAt).toLocaleDateString('ja-JP')
                const isWinner = match.winnerId === this.authManager.getCurrentUser()?.id
                return `
                  <div class="flex items-center justify-between p-3 bg-game-bg rounded border border-gray-600">
                    <div>
                      <span class="${isWinner ? 'text-green-400' : 'text-red-400'} font-bold">
                        ${isWinner ? '勝利' : '敗北'}
                      </span>
                      <span class="text-gray-400 ml-2">${playedAt}</span>
                    </div>
                    <div class="text-white">
                      ${match.score.player1} - ${match.score.player2}
                    </div>
                  </div>
                `
              }).join('')}
            </div>
          `
        }
      }
    } catch (error: any) {
      console.error('Failed to load stats:', error.message)
    }
  }

  public async viewUserStats(userId: string) {
    try {
      const [user, stats] = await Promise.all([
        this.authManager.getUserById(userId),
        this.authManager.getStats(userId)
      ])

      alert(`${user.displayName}の統計:\n勝利: ${stats.wins}\n敗北: ${stats.losses}\n総試合: ${stats.totalGames}\n勝率: ${stats.winRate}%`)
    } catch (error: any) {
      alert(`統計読み込みエラー: ${error.message}`)
    }
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
  e.preventDefault()
  const form = e.target as HTMLFormElement
  const formData = new FormData(form)
  
  if (form.id === 'login-form') {
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    
    if (username && password) {
      app.login(username, password)
    } else {
      alert('ユーザー名とパスワードを入力してください')
    }
  } else if (form.id === 'signup-form') {
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    
    if (username && password) {
      app.signup(username, password)
    } else {
      alert('ユーザー名とパスワードを入力してください')
    }
  } else if (form.id === 'profile-form') {
    const displayName = formData.get('displayName') as string
    
    if (displayName.trim()) {
      app.updateProfile(displayName.trim())
    } else {
      alert('表示名を入力してください')
    }
  } else if (form.id === 'register-form') {
    const playerName = formData.get('playerName') as string
    
    if (playerName.trim()) {
      app.registerPlayer(playerName.trim())
    } else {
      alert('プレイヤー名を入力してください')
    }
  }
})

// Handle search users on Enter key
document.addEventListener('keypress', (e) => {
  if (e.target && (e.target as HTMLElement).id === 'search-users' && e.key === 'Enter') {
    app.searchUsers()
  }
})