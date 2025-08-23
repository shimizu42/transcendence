import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  ActionManager,
  ExecuteCodeAction,
  DirectionalLight,
  Mesh
} from '@babylonjs/core'

export class Pong3DGame {
  private engine: Engine
  private scene!: Scene
  private canvas: HTMLCanvasElement
  private camera!: ArcRotateCamera
  private ball: Mesh | null = null
  private paddle1: Mesh | null = null
  private paddle2: Mesh | null = null
  private ballVelocity: Vector3
  private gameData: any = null
  private keys: Set<string> = new Set()

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.engine = new Engine(canvas, true)
    this.ballVelocity = new Vector3(0.1, 0, 0.05)
    
    this.setupScene()
    this.setupCamera()
    this.setupLighting()
    this.createGameObjects()
    this.setupInput()
    this.setupRenderLoop()
    this.setupFullscreenCanvas()
  }

  private setupScene() {
    this.scene = new Scene(this.engine)
    this.scene.createDefaultEnvironment({
      createGround: false,
      createSkybox: false
    })
  }

  private setupCamera() {
    this.camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2, // 横からの視点
      Math.PI / 2.5, // 少し上からの角度
      15, // Pongフィールド全体が見える距離
      Vector3.Zero(), // フィールド中心
      this.scene
    )
    this.camera.attachControl(this.canvas, true)
    this.camera.setTarget(Vector3.Zero())
    
    // カメラ制限を設定
    this.camera.lowerRadiusLimit = 10
    this.camera.upperRadiusLimit = 25
    this.camera.lowerBetaLimit = Math.PI / 6  // 真上から見るのを防ぐ
    this.camera.upperBetaLimit = Math.PI / 2.2  // 真横から見るのを防ぐ
  }

  private setupLighting() {
    // 環境光 - 全体を明るく
    const ambientLight = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), this.scene)
    ambientLight.intensity = 0.6

    // メインライト - プレイヤーを照らす
    const mainLight = new DirectionalLight('mainLight', new Vector3(-0.5, -1, -0.5), this.scene)
    mainLight.position = new Vector3(10, 15, 5)
    mainLight.intensity = 0.8
    mainLight.diffuse = new Color3(1, 0.95, 0.8) // 暖かい光

    // フィルライト - 影を和らげる
    const fillLight = new DirectionalLight('fillLight', new Vector3(0.5, -0.5, 0.5), this.scene)
    fillLight.position = new Vector3(-10, 10, -5)
    fillLight.intensity = 0.3
    fillLight.diffuse = new Color3(0.7, 0.8, 1) // 青っぽい光
  }

  private createGameObjects() {
    this.createGameField()
    this.createPaddles()
    this.createBall()
  }

  private createGameField() {
    // Pongゲームフィールド
    const fieldWidth = 12
    const fieldHeight = 8
    const wallThickness = 0.2

    // ゲームフィールドの床
    const floor = MeshBuilder.CreateBox('floor', {
      width: fieldWidth,
      height: 0.1,
      depth: fieldHeight
    }, this.scene)
    floor.position.y = -0.5
    
    const floorMaterial = new StandardMaterial('floorMaterial', this.scene)
    floorMaterial.diffuseColor = new Color3(0.1, 0.1, 0.2) // 暗い青
    floor.material = floorMaterial

    // 上下の壁
    const topWall = MeshBuilder.CreateBox('topWall', {
      width: fieldWidth,
      height: 1,
      depth: wallThickness
    }, this.scene)
    topWall.position = new Vector3(0, 0, fieldHeight / 2)

    const bottomWall = MeshBuilder.CreateBox('bottomWall', {
      width: fieldWidth,
      height: 1,
      depth: wallThickness
    }, this.scene)
    bottomWall.position = new Vector3(0, 0, -fieldHeight / 2)

    const wallMaterial = new StandardMaterial('wallMaterial', this.scene)
    wallMaterial.diffuseColor = new Color3(0, 0.8, 1) // シアン色
    topWall.material = wallMaterial
    bottomWall.material = wallMaterial

    // センターライン
    const centerLine = MeshBuilder.CreateBox('centerLine', {
      width: 0.1,
      height: 0.05,
      depth: fieldHeight
    }, this.scene)
    centerLine.position.y = -0.4
    
    const centerMaterial = new StandardMaterial('centerMaterial', this.scene)
    centerMaterial.diffuseColor = new Color3(0, 0.8, 1) // シアン色
    centerLine.material = centerMaterial
  }

  private createPaddles() {
    // Player 1 paddle (left side)
    this.paddle1 = MeshBuilder.CreateBox('paddle1', {
      width: 0.3,
      height: 0.3,
      depth: 1.5
    }, this.scene)
    this.paddle1.position = new Vector3(-5, 0, 0)

    // Player 2 paddle (right side)
    this.paddle2 = MeshBuilder.CreateBox('paddle2', {
      width: 0.3,
      height: 0.3,
      depth: 1.5
    }, this.scene)
    this.paddle2.position = new Vector3(5, 0, 0)

    const paddleMaterial = new StandardMaterial('paddleMaterial', this.scene)
    paddleMaterial.diffuseColor = new Color3(0, 0.8, 1)
    paddleMaterial.emissiveColor = new Color3(0, 0.2, 0.3)
    
    this.paddle1.material = paddleMaterial
    this.paddle2.material = paddleMaterial
  }

  private createBall() {
    // Pongボール
    this.ball = MeshBuilder.CreateSphere('ball', { diameter: 0.4 }, this.scene)
    this.ball.position = Vector3.Zero()

    const ballMaterial = new StandardMaterial('ballMaterial', this.scene)
    ballMaterial.diffuseColor = new Color3(1, 1, 1) // 白いボール
    ballMaterial.emissiveColor = new Color3(0.2, 0.2, 0.2)
    this.ball.material = ballMaterial
  }

  private setupInput() {
    this.scene.actionManager = new ActionManager(this.scene)

    // Key down events
    this.scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
      this.keys.add(evt.sourceEvent.key)
      this.handleInput()
    }))

    // Key up events
    this.scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
      this.keys.delete(evt.sourceEvent.key)
    }))
  }

  private setupRenderLoop() {
    this.engine.runRenderLoop(() => {
      this.updateGame()
      this.scene.render()
    })

    window.addEventListener('resize', () => {
      this.engine.resize()
    })
  }

  private setupFullscreenCanvas() {
    // Make canvas fullscreen
    this.canvas.style.width = '100vw'
    this.canvas.style.height = '100vh'
    this.canvas.style.display = 'block'
    
    // Set canvas size to match viewport
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    
    // Resize engine
    this.engine.resize()
    
    // Update on window resize
    const resizeHandler = () => {
      this.canvas.width = window.innerWidth
      this.canvas.height = window.innerHeight
      this.engine.resize()
    }
    
    window.addEventListener('resize', resizeHandler)
  }

  private updateGame() {
    if (!this.gameData || this.gameData.gameState !== 'playing') return

    // Update ball position from server data
    if (this.gameData.ball && this.ball) {
      const ballX = ((this.gameData.ball.x - 50) / 50) * 5
      const ballZ = ((this.gameData.ball.y - 50) / 50) * 3
      this.ball.position.x = ballX
      this.ball.position.z = ballZ
    }

    // Update paddle positions from server data
    if (this.gameData.players.length > 0 && this.paddle1) {
      const player1 = this.gameData.players[0]
      const paddle1Z = ((player1.position.y - 50) / 50) * 3
      this.paddle1.position.z = paddle1Z
    }

    if (this.gameData.players.length > 1 && this.paddle2) {
      const player2 = this.gameData.players[1]
      const paddle2Z = ((player2.position.y - 50) / 50) * 3
      this.paddle2.position.z = paddle2Z
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

  public updateGameData(gameData: any) {
    this.gameData = gameData
  }

  public dispose() {
    this.engine.dispose()
  }
}