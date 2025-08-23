import { Pong3DGame } from './pong3D'

export class GameManager {
  private canvas: HTMLCanvasElement | null = null
  private pong3D: Pong3DGame | null = null
  private gameData: any = null
  private keys: Set<string> = new Set()

  constructor() {
    this.setupKeyboardEvents()
  }

  private setupKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      this.keys.add(e.key)
      this.handleInput()
    })

    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.key)
    })
  }

  public updateGame(gameData: any) {
    console.log('Game update received:', gameData)
    this.gameData = gameData
    this.initCanvas()
    
    // Initialize 3D mode on first game data
    if (!this.pong3D) {
      this.init3D()
    }
    
    this.render3DGame()
    this.updateGameInfo()
  }

  private initCanvas() {
    if (!this.canvas) {
      this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement
    }
  }

  private handleInput() {
    if (!this.gameData || !window.app) return

    const playerId = window.app.getPlayerId()
    if (!playerId) return

    let newPosition = null
    const currentPlayer = this.gameData.players.find((p: any) => p.id === playerId)
    
    if (!currentPlayer) return

    let currentY = currentPlayer.position.y

    if (this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has('W')) {
      currentY = Math.max(10, currentY - 2)
      newPosition = { x: currentPlayer.position.x, y: currentY }
    }

    if (this.keys.has('ArrowDown') || this.keys.has('s') || this.keys.has('S')) {
      currentY = Math.min(90, currentY + 2)
      newPosition = { x: currentPlayer.position.x, y: currentY }
    }

    if (newPosition) {
      window.app.sendPlayerMove(this.gameData.id, newPosition)
    }
  }

  private init3D() {
    if (!this.canvas) return
    
    try {
      this.pong3D = new Pong3DGame(this.canvas)
      if (this.gameData) {
        this.pong3D.updateGameData(this.gameData)
      }
    } catch (error) {
      console.error('Failed to initialize 3D mode:', error)
    }
  }

  private render3DGame() {
    if (this.pong3D && this.gameData) {
      this.pong3D.updateGameData(this.gameData)
    }
  }

  private updateGameInfo() {
    const gameInfo = document.getElementById('game-info')
    const readyBtn = document.getElementById('ready-btn')
    
    if (!this.gameData) return

    if (gameInfo) {
      let infoText = ''
      switch (this.gameData.gameState) {
        case 'waiting':
          infoText = `プレイヤー待機中... (${this.gameData.players.length}/2)`
          break
        case 'ready':
          const readyCount = this.gameData.players.filter((p: any) => p.ready).length
          infoText = `プレイヤー準備中... (${readyCount}/${this.gameData.players.length})`
          break
        case 'playing':
          infoText = 'ゲーム進行中!'
          break
        case 'finished':
          infoText = 'ゲーム終了'
          break
        default:
          infoText = this.gameData.gameState
      }
      gameInfo.innerHTML = `<p class="text-gray-300">${infoText}</p>`
    }

    // Update ready button based on game state and player count
    if (readyBtn) {
      const currentPlayer = window.app?.getPlayerId()
      const player = this.gameData.players.find((p: any) => p.id === currentPlayer)
      
      if (this.gameData.gameState === 'waiting' && this.gameData.players.length < 2) {
        readyBtn.textContent = '2人目のプレイヤーを待機中...'
        readyBtn.setAttribute('disabled', 'true')
      } else if (this.gameData.gameState === 'ready' && this.gameData.players.length === 2) {
        if (player?.ready) {
          readyBtn.textContent = '準備完了 - 相手を待機中'
          readyBtn.setAttribute('disabled', 'true')
        } else {
          readyBtn.textContent = '準備完了'
          readyBtn.removeAttribute('disabled')
        }
      } else if (this.gameData.gameState === 'playing') {
        readyBtn.textContent = 'ゲーム中'
        readyBtn.setAttribute('disabled', 'true')
      } else if (this.gameData.gameState === 'finished') {
        readyBtn.textContent = 'ゲーム終了'
        readyBtn.setAttribute('disabled', 'true')
      }
    }
  }
}