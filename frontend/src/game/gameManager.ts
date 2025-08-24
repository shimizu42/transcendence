import { Pong3DGame } from './pong3D'
import { Tank3DGame } from './tank3D'

export class GameManager {
  private canvas: HTMLCanvasElement | null = null
  private pong3D: Pong3DGame | null = null
  private tank3D: Tank3DGame | null = null
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
    console.log('Game update received - gameType:', gameData.gameType)
    this.gameData = gameData
    this.initCanvas()
    
    // Initialize game based on type - check multiple possible locations
    const gameType = gameData.gameType || gameData.type || gameData.mode || 'pong'
    
    if (gameType === 'pong') {
      if (!this.pong3D) {
        this.initPong3D()
      }
      this.renderPong3DGame()
    } else if (gameType === 'tank') {
      if (!this.tank3D) {
        this.initTank3D()
      }
      this.renderTank3DGame()
    }
    
    this.updateGameInfo()
    this.updateInstructions(gameType)
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

  private initPong3D() {
    if (!this.canvas) return
    
    try {
      // Dispose existing games
      if (this.tank3D) {
        this.tank3D.dispose()
        this.tank3D = null
      }
      
      this.pong3D = new Pong3DGame(this.canvas)
      if (this.gameData) {
        this.pong3D.updateGameData(this.gameData)
      }
    } catch (error) {
      console.error('Failed to initialize Pong 3D mode:', error)
    }
  }

  private initTank3D() {
    if (!this.canvas) return
    
    try {
      // Dispose existing games
      if (this.pong3D) {
        this.pong3D.dispose()
        this.pong3D = null
      }
      
      this.tank3D = new Tank3DGame(this.canvas)
      if (this.gameData) {
        this.tank3D.updateGameData(this.gameData)
      }
    } catch (error) {
      console.error('Failed to initialize Tank 3D mode:', error)
    }
  }

  private renderPong3DGame() {
    if (this.pong3D && this.gameData) {
      this.pong3D.updateGameData(this.gameData)
    }
  }

  private renderTank3DGame() {
    if (this.tank3D && this.gameData) {
      this.tank3D.updateGameData(this.gameData)
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

  private updateInstructions(gameType: string) {
    const pongInstructions = document.getElementById('pong-instructions')
    const tankInstructions = document.getElementById('tank-instructions')

    if (pongInstructions && tankInstructions) {
      if (gameType === 'tank') {
        pongInstructions.classList.add('hidden')
        tankInstructions.classList.remove('hidden')
      } else {
        tankInstructions.classList.add('hidden')
        pongInstructions.classList.remove('hidden')
      }
    }
  }
}