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
  Mesh,
  CannonJSPlugin,
  PhysicsImpostor
} from '@babylonjs/core'

export class Tank3DGame {
  private engine: Engine
  private scene!: Scene
  private canvas: HTMLCanvasElement
  private camera!: ArcRotateCamera
  private tank1: Mesh | null = null
  private tank2: Mesh | null = null
  private tank1Turret: Mesh | null = null
  private tank2Turret: Mesh | null = null
  private bullets: Mesh[] = []
  private gameData: any = null
  private keys: Set<string> = new Set()
  private fieldWidth = 20
  private fieldHeight = 20

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.engine = new Engine(canvas, true)
    
    this.setupScene()
    this.setupPhysics()
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
      createSkybox: true,
      skyboxColor: new Color3(0.1, 0.1, 0.2)
    })
  }

  private setupPhysics() {
    try {
      this.scene.enablePhysics(new Vector3(0, -9.81, 0), new CannonJSPlugin())
    } catch (error) {
      console.warn('Physics engine not available, using simple collision detection')
    }
  }

  private setupCamera() {
    this.camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 4,
      Math.PI / 3,
      30,
      Vector3.Zero(),
      this.scene
    )
    this.camera.attachControl(this.canvas, true)
    this.camera.setTarget(Vector3.Zero())
    
    this.camera.lowerRadiusLimit = 15
    this.camera.upperRadiusLimit = 50
    this.camera.lowerBetaLimit = Math.PI / 6
    this.camera.upperBetaLimit = Math.PI / 2.2
  }

  private setupLighting() {
    const ambientLight = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), this.scene)
    ambientLight.intensity = 0.4

    const mainLight = new DirectionalLight('mainLight', new Vector3(-0.5, -1, -0.5), this.scene)
    mainLight.position = new Vector3(15, 20, 10)
    mainLight.intensity = 1.0
    mainLight.diffuse = new Color3(1, 0.95, 0.8)

    const fillLight = new DirectionalLight('fillLight', new Vector3(0.5, -0.5, 0.5), this.scene)
    fillLight.position = new Vector3(-15, 15, -10)
    fillLight.intensity = 0.4
    fillLight.diffuse = new Color3(0.7, 0.8, 1)
  }

  private createGameObjects() {
    this.createBattlefield()
    this.createTanks()
  }

  private createBattlefield() {
    const ground = MeshBuilder.CreateGround('ground', {
      width: this.fieldWidth,
      height: this.fieldHeight
    }, this.scene)
    ground.position.y = -0.5
    
    const groundMaterial = new StandardMaterial('groundMaterial', this.scene)
    groundMaterial.diffuseColor = new Color3(0.2, 0.3, 0.1)
    groundMaterial.specularColor = new Color3(0, 0, 0)
    ground.material = groundMaterial

    if (this.scene.getPhysicsEngine()) {
      ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, 
        { mass: 0, restitution: 0.1 }, this.scene)
    }

    this.createWalls()
    this.createObstacles()
  }

  private createWalls() {
    const wallHeight = 2
    const wallThickness = 0.5
    const wallMaterial = new StandardMaterial('wallMaterial', this.scene)
    wallMaterial.diffuseColor = new Color3(0.5, 0.3, 0.1)

    const walls = [
      { name: 'northWall', size: { width: this.fieldWidth, height: wallHeight, depth: wallThickness }, 
        position: new Vector3(0, wallHeight/2, this.fieldHeight/2) },
      { name: 'southWall', size: { width: this.fieldWidth, height: wallHeight, depth: wallThickness }, 
        position: new Vector3(0, wallHeight/2, -this.fieldHeight/2) },
      { name: 'eastWall', size: { width: wallThickness, height: wallHeight, depth: this.fieldHeight }, 
        position: new Vector3(this.fieldWidth/2, wallHeight/2, 0) },
      { name: 'westWall', size: { width: wallThickness, height: wallHeight, depth: this.fieldHeight }, 
        position: new Vector3(-this.fieldWidth/2, wallHeight/2, 0) }
    ]

    walls.forEach(wallData => {
      const wall = MeshBuilder.CreateBox(wallData.name, wallData.size, this.scene)
      wall.position = wallData.position
      wall.material = wallMaterial

      if (this.scene.getPhysicsEngine()) {
        wall.physicsImpostor = new PhysicsImpostor(wall, PhysicsImpostor.BoxImpostor, 
          { mass: 0, restitution: 0.1 }, this.scene)
      }
    })
  }

  private createObstacles() {
    const obstacleMaterial = new StandardMaterial('obstacleMaterial', this.scene)
    obstacleMaterial.diffuseColor = new Color3(0.4, 0.4, 0.4)
    
    const obstacles = [
      new Vector3(-5, 0.5, -5),
      new Vector3(5, 0.5, 5),
      new Vector3(-5, 0.5, 5),
      new Vector3(5, 0.5, -5),
      new Vector3(0, 0.5, 0)
    ]

    obstacles.forEach((pos, index) => {
      const obstacle = MeshBuilder.CreateBox(`obstacle${index}`, {
        width: 2, height: 1, depth: 2
      }, this.scene)
      obstacle.position = pos
      obstacle.material = obstacleMaterial

      if (this.scene.getPhysicsEngine()) {
        obstacle.physicsImpostor = new PhysicsImpostor(obstacle, PhysicsImpostor.BoxImpostor, 
          { mass: 0, restitution: 0.1 }, this.scene)
      }
    })
  }

  private createTanks() {
    this.tank1 = this.createTank('tank1', new Vector3(-8, 0, -8), new Color3(0, 0.8, 1))
    this.tank2 = this.createTank('tank2', new Vector3(8, 0, 8), new Color3(1, 0.3, 0))
    
    this.tank1Turret = this.createTurret('tank1Turret', this.tank1)
    this.tank2Turret = this.createTurret('tank2Turret', this.tank2)
  }

  private createTank(name: string, position: Vector3, color: Color3): Mesh {
    const tankBody = MeshBuilder.CreateBox(`${name}Body`, {
      width: 2, height: 0.8, depth: 3
    }, this.scene)
    tankBody.position = position

    const tankMaterial = new StandardMaterial(`${name}Material`, this.scene)
    tankMaterial.diffuseColor = color
    tankMaterial.emissiveColor = color.scale(0.2)
    tankBody.material = tankMaterial

    if (this.scene.getPhysicsEngine()) {
      tankBody.physicsImpostor = new PhysicsImpostor(tankBody, PhysicsImpostor.BoxImpostor, 
        { mass: 1, restitution: 0.1, friction: 0.8 }, this.scene)
    }

    return tankBody
  }

  private createTurret(name: string, tank: Mesh): Mesh {
    const turret = MeshBuilder.CreateCylinder(`${name}`, {
      height: 0.5, diameterTop: 1, diameterBottom: 1
    }, this.scene)
    turret.position = tank.position.clone()
    turret.position.y += 0.65
    turret.parent = tank

    const barrel = MeshBuilder.CreateCylinder(`${name}Barrel`, {
      height: 2, diameterTop: 0.2, diameterBottom: 0.2
    }, this.scene)
    barrel.rotation.z = Math.PI / 2
    barrel.position = new Vector3(1, 0, 0)
    barrel.parent = turret

    const turretMaterial = tank.material as StandardMaterial
    turret.material = turretMaterial
    barrel.material = turretMaterial

    return turret
  }

  private setupInput() {
    this.scene.actionManager = new ActionManager(this.scene)

    this.scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
      this.keys.add(evt.sourceEvent.key)
      this.handleInput()
    }))

    this.scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
      this.keys.delete(evt.sourceEvent.key)
    }))
    
    this.canvas.setAttribute('tabindex', '0')
    this.canvas.focus()
    
    this.canvas.addEventListener('keydown', (evt) => {
      this.keys.add(evt.key)
      this.handleInput()
      evt.preventDefault()
    })
    
    this.canvas.addEventListener('keyup', (evt) => {
      this.keys.delete(evt.key)
      evt.preventDefault()
    })
    
    this.canvas.addEventListener('click', () => {
      this.canvas.focus()
    })
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
    this.canvas.style.width = '100vw'
    this.canvas.style.height = '100vh'
    this.canvas.style.display = 'block'
    
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    
    this.engine.resize()
    
    const resizeHandler = () => {
      this.canvas.width = window.innerWidth
      this.canvas.height = window.innerHeight
      this.engine.resize()
    }
    
    window.addEventListener('resize', resizeHandler)
  }

  private updateGame() {
    if (!this.gameData || this.gameData.gameState !== 'playing') return

    if (this.gameData.players.length > 0 && this.tank1) {
      const player1 = this.gameData.players[0]
      this.updateTankPosition(this.tank1, player1.position)
      if (this.tank1Turret) {
        this.tank1Turret.rotation.y = player1.turretRotation || 0
      }
    }

    if (this.gameData.players.length > 1 && this.tank2) {
      const player2 = this.gameData.players[1]
      this.updateTankPosition(this.tank2, player2.position)
      if (this.tank2Turret) {
        this.tank2Turret.rotation.y = player2.turretRotation || 0
      }
    }

    this.updateBullets()
  }

  private updateTankPosition(tank: Mesh, serverPosition: any) {
    const targetX = ((serverPosition.x - 50) / 50) * (this.fieldWidth / 2 - 1)
    const targetZ = ((serverPosition.y - 50) / 50) * (this.fieldHeight / 2 - 1)
    
    tank.position.x = targetX
    tank.position.z = targetZ
    tank.rotation.y = serverPosition.rotation || 0
  }

  private updateBullets() {
    if (!this.gameData.bullets) return

    this.bullets.forEach(bullet => {
      if (bullet.parent) {
        bullet.parent = null
      }
      bullet.dispose()
    })
    this.bullets = []

    this.gameData.bullets.forEach((bulletData: any) => {
      const bullet = this.createBullet(bulletData)
      this.bullets.push(bullet)
    })
  }

  private createBullet(bulletData: any): Mesh {
    const bullet = MeshBuilder.CreateSphere('bullet', { diameter: 0.3 }, this.scene)
    
    const bulletX = ((bulletData.x - 50) / 50) * (this.fieldWidth / 2)
    const bulletZ = ((bulletData.y - 50) / 50) * (this.fieldHeight / 2)
    
    bullet.position = new Vector3(bulletX, 1, bulletZ)
    
    const bulletMaterial = new StandardMaterial('bulletMaterial', this.scene)
    bulletMaterial.diffuseColor = new Color3(1, 1, 0)
    bulletMaterial.emissiveColor = new Color3(0.5, 0.5, 0)
    bullet.material = bulletMaterial

    if (this.scene.getPhysicsEngine()) {
      bullet.physicsImpostor = new PhysicsImpostor(bullet, PhysicsImpostor.SphereImpostor, 
        { mass: 0.1, restitution: 0.3 }, this.scene)
    }

    return bullet
  }

  private handleInput() {
    if (!this.gameData || !window.app) return

    const playerId = window.app.getPlayerId()
    if (!playerId) return

    let hasInput = false
    const currentPlayer = this.gameData.players.find((p: any) => p.id === playerId)
    
    if (!currentPlayer) return

    let currentX = currentPlayer.position.x
    let currentY = currentPlayer.position.y
    let currentRotation = currentPlayer.position.rotation || 0
    let currentTurretRotation = currentPlayer.turretRotation || 0
    let shouldShoot = false

    const moveSpeed = 1.5
    const rotateSpeed = 0.05
    const turretSpeed = 0.08

    if (this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has('W')) {
      const dx = Math.sin(currentRotation) * moveSpeed
      const dy = -Math.cos(currentRotation) * moveSpeed
      currentX = Math.max(5, Math.min(95, currentX + dx))
      currentY = Math.max(5, Math.min(95, currentY + dy))
      hasInput = true
    }

    if (this.keys.has('ArrowDown') || this.keys.has('s') || this.keys.has('S')) {
      const dx = -Math.sin(currentRotation) * moveSpeed
      const dy = Math.cos(currentRotation) * moveSpeed
      currentX = Math.max(5, Math.min(95, currentX + dx))
      currentY = Math.max(5, Math.min(95, currentY + dy))
      hasInput = true
    }

    if (this.keys.has('ArrowLeft') || this.keys.has('a') || this.keys.has('A')) {
      currentRotation -= rotateSpeed
      hasInput = true
    }

    if (this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D')) {
      currentRotation += rotateSpeed
      hasInput = true
    }

    if (this.keys.has('q') || this.keys.has('Q')) {
      currentTurretRotation -= turretSpeed
      hasInput = true
    }

    if (this.keys.has('e') || this.keys.has('E')) {
      currentTurretRotation += turretSpeed
      hasInput = true
    }

    if (this.keys.has(' ') || this.keys.has('f') || this.keys.has('F')) {
      shouldShoot = true
      hasInput = true
    }

    if (hasInput) {
      window.app.sendTankAction(this.gameData.id, {
        position: { 
          x: currentX, 
          y: currentY, 
          rotation: currentRotation 
        },
        turretRotation: currentTurretRotation,
        shoot: shouldShoot
      })
    }
  }

  public updateGameData(gameData: any) {
    this.gameData = gameData
  }

  public dispose() {
    this.bullets.forEach(bullet => bullet.dispose())
    this.bullets = []
    this.engine.dispose()
  }
}