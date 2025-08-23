export class GameManager {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
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
    this.renderGame()
    this.updateGameInfo()
  }

  private initCanvas() {
    if (!this.canvas) {
      this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement
      if (this.canvas) {
        this.ctx = this.canvas.getContext('2d')
      }
    }
  }

  private renderGame() {
    if (!this.ctx || !this.canvas || !this.gameData) return

    // Clear canvas
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw center line
    this.ctx.strokeStyle = '#00d4ff'
    this.ctx.setLineDash([10, 10])
    this.ctx.beginPath()
    this.ctx.moveTo(this.canvas.width / 2, 0)
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height)
    this.ctx.stroke()
    this.ctx.setLineDash([])

    // Draw paddles
    this.ctx.fillStyle = '#00d4ff'
    
    if (this.gameData.players.length > 0) {
      const player1 = this.gameData.players[0]
      const paddle1Y = (player1.position.y / 100) * this.canvas.height - 50
      this.ctx.fillRect(20, paddle1Y, 10, 100)
    }

    if (this.gameData.players.length > 1) {
      const player2 = this.gameData.players[1]
      const paddle2Y = (player2.position.y / 100) * this.canvas.height - 50
      this.ctx.fillRect(this.canvas.width - 30, paddle2Y, 10, 100)
    }

    // Draw ball
    this.ctx.fillStyle = '#ffffff'
    const ballX = (this.gameData.ball.x / 100) * this.canvas.width
    const ballY = (this.gameData.ball.y / 100) * this.canvas.height
    this.ctx.beginPath()
    this.ctx.arc(ballX, ballY, 8, 0, Math.PI * 2)
    this.ctx.fill()

    // Draw score
    this.ctx.fillStyle = '#00d4ff'
    this.ctx.font = '48px Courier New'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(
      this.gameData.score.player1.toString(),
      this.canvas.width / 4,
      60
    )
    this.ctx.fillText(
      this.gameData.score.player2.toString(),
      (3 * this.canvas.width) / 4,
      60
    )

    // Draw player names
    this.ctx.font = '16px Courier New'
    if (this.gameData.players.length > 0) {
      this.ctx.textAlign = 'left'
      this.ctx.fillText(this.gameData.players[0].name, 40, 30)
    }
    if (this.gameData.players.length > 1) {
      this.ctx.textAlign = 'right'
      this.ctx.fillText(this.gameData.players[1].name, this.canvas.width - 40, 30)
    }

    // Draw game state
    if (this.gameData.gameState !== 'playing') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      
      this.ctx.fillStyle = '#00d4ff'
      this.ctx.font = '32px Courier New'
      this.ctx.textAlign = 'center'
      
      let message = ''
      switch (this.gameData.gameState) {
        case 'waiting':
          message = 'プレイヤーを待機中...'
          break
        case 'finished':
          const winner = this.gameData.score.player1 > this.gameData.score.player2 
            ? this.gameData.players[0]?.name || 'Player 1'
            : this.gameData.players[1]?.name || 'Player 2'
          message = `${winner} の勝利！`
          break
      }
      
      this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2)
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