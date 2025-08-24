import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import cors from '@fastify/cors'
import { v4 as uuidv4 } from 'uuid'
import * as auth from './auth'

const fastify = Fastify({
  logger: true
})

// WebSocket connection interface
interface Player {
  id: string
  name: string
  socket: any
  ready: boolean
  position: { x: number, y: number }
}

interface Game {
  id: string
  gameType: 'pong' | 'tank'
  players: Player[]
  ball?: { x: number, y: number, dx: number, dy: number }
  tanks?: { [playerId: string]: { position: { x: number, y: number, rotation: number }, turretRotation: number, health: number } }
  bullets?: { id: string, x: number, y: number, dx: number, dy: number, ownerId: string }[]
  score: { player1: number, player2: number }
  gameState: 'waiting' | 'ready' | 'playing' | 'finished'
}

interface Tournament {
  id: string
  name: string
  gameType: 'pong' | 'tank'
  players: Player[]
  matches: Match[]
  currentRound: number
  status: 'registration' | 'playing' | 'finished'
}

interface Match {
  id: string
  player1: Player
  player2: Player
  winner?: Player
  status: 'pending' | 'playing' | 'finished'
}

// Store active games and tournaments
const games = new Map<string, Game>()
const tournaments = new Map<string, Tournament>()
const players = new Map<string, Player>()

// Register plugins
fastify.register(cors, {
  origin: true
})

fastify.register(websocket)

// Authentication middleware
async function authenticate(request: any, reply: any) {
  try {
    console.log('=== Authentication ===')
    console.log('Authorization header:', request.headers.authorization)
    
    const token = request.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      console.log('No token provided')
      reply.status(401)
      return { error: 'No token provided' }
    }
    
    const userId = await auth.verifyToken(token)
    if (!userId) {
      console.log('Invalid token')
      reply.status(401)  
      return { error: 'Invalid token' }
    }
    
    console.log('Authentication successful for user:', userId)
    request.userId = userId
    return null // Success
  } catch (error) {
    console.error('Authentication error:', error)
    reply.status(401)
    return { error: 'Authentication failed' }
  }
}

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' }
})

// User Authentication endpoints
fastify.post('/api/auth/register', async (request, reply) => {
  try {
    const { username, displayName, password, avatar } = request.body as {
      username: string
      displayName: string
      password: string
      avatar?: string
    }
    
    if (!username || !displayName || !password) {
      reply.status(400)
      return { error: 'Missing required fields' }
    }
    
    const user = await auth.createUser({ username, displayName, password, avatar })
    const token = auth.generateToken(user.id)
    
    return { user, token }
  } catch (error: any) {
    reply.status(400)
    return { error: error.message }
  }
})

fastify.post('/api/auth/login', async (request, reply) => {
  try {
    const { username, password } = request.body as { username: string, password: string }
    
    if (!username || !password) {
      reply.status(400)
      return { error: 'Username and password required' }
    }
    
    const user = await auth.authenticateUser(username, password)
    if (!user) {
      reply.status(401)
      return { error: 'Invalid credentials' }
    }
    
    const token = auth.generateToken(user.id)
    return { user, token }
  } catch (error: any) {
    reply.status(400)
    return { error: error.message }
  }
})

// User Profile endpoints  
fastify.get('/api/users/me', async (request, reply) => {
  const authResult = await authenticate(request, reply)
  if (authResult) return authResult
  
  try {
    const user = await auth.getUserById((request as any).userId)
    if (!user) {
      reply.status(404)
      return { error: 'User not found' }
    }
    return user
  } catch (error: any) {
    reply.status(500)
    return { error: error.message }
  }
})

fastify.put('/api/users/me', async (request, reply) => {
  const authResult = await authenticate(request, reply)
  if (authResult) return authResult
  
  try {
    const { displayName, avatar } = request.body as { displayName?: string, avatar?: string }
    const user = await auth.updateUserProfile((request as any).userId, { displayName, avatar })
    return user
  } catch (error: any) {
    reply.status(400)
    return { error: error.message }
  }
})

fastify.get('/api/users/search', async (request, reply) => {
  const authResult = await authenticate(request, reply)
  if (authResult) return authResult
  
  try {
    const { query } = request.query as { query?: string }
    if (!query) {
      reply.status(400)
      return { error: 'Query parameter required' }
    }
    
    const users = await auth.searchUsers(query)
    return users
  } catch (error: any) {
    reply.status(500)
    return { error: error.message }
  }
})

fastify.get('/api/users/:id', async (request, reply) => {
  const authResult = await authenticate(request, reply)
  if (authResult) return authResult
  
  try {
    const { id } = request.params as { id: string }
    const user = await auth.getUserById(id)
    if (!user) {
      reply.status(404)
      return { error: 'User not found' }
    }
    return user
  } catch (error: any) {
    reply.status(500)
    return { error: error.message }
  }
})

// Friends endpoints
fastify.get('/api/users/me/friends', async (request, reply) => {
  const authResult = await authenticate(request, reply)
  if (authResult) return authResult
  
  try {
    const friends = await auth.getFriends((request as any).userId)
    return friends
  } catch (error: any) {
    reply.status(500)
    return { error: error.message }
  }
})

fastify.post('/api/users/me/friends/:friendId', async (request, reply) => {
  console.log('=== Friend Addition Request ===')
  console.log('Headers:', request.headers)
  console.log('Params:', request.params)
  console.log('Body:', request.body)
  
  const authResult = await authenticate(request, reply)
  if (authResult) {
    console.log('Authentication failed:', authResult)
    return authResult
  }
  
  try {
    const { friendId } = request.params as { friendId: string }
    const userId = (request as any).userId
    console.log(`Adding friend: userId=${userId}, friendId=${friendId}`)
    
    await auth.addFriend(userId, friendId)
    console.log('Friend added successfully')
    return { success: true }
  } catch (error: any) {
    console.error('Friend addition error:', error.message)
    reply.status(400)
    return { error: error.message }
  }
})

fastify.delete('/api/users/me/friends/:friendId', async (request, reply) => {
  const authResult = await authenticate(request, reply)
  if (authResult) return authResult
  
  try {
    const { friendId } = request.params as { friendId: string }
    await auth.removeFriend((request as any).userId, friendId)
    return { success: true }
  } catch (error: any) {
    reply.status(400)
    return { error: error.message }
  }
})

// Statistics and Match History endpoints
fastify.get('/api/users/me/stats', async (request, reply) => {
  const authResult = await authenticate(request, reply)
  if (authResult) return authResult
  
  try {
    const stats = await auth.getUserStats((request as any).userId)
    return stats
  } catch (error: any) {
    reply.status(500)
    return { error: error.message }
  }
})

fastify.get('/api/users/me/matches', async (request, reply) => {
  const authResult = await authenticate(request, reply)
  if (authResult) return authResult
  
  try {
    const matches = await auth.getMatchHistory((request as any).userId)
    return matches
  } catch (error: any) {
    reply.status(500)
    return { error: error.message }
  }
})

fastify.get('/api/users/:id/stats', async (request, reply) => {
  const authResult = await authenticate(request, reply)
  if (authResult) return authResult
  
  try {
    const { id } = request.params as { id: string }
    const stats = await auth.getUserStats(id)
    return stats
  } catch (error: any) {
    reply.status(500)
    return { error: error.message }
  }
})

fastify.get('/api/users/:id/matches', async (request, reply) => {
  const authResult = await authenticate(request, reply)
  if (authResult) return authResult
  
  try {
    const { id } = request.params as { id: string }
    const matches = await auth.getMatchHistory(id)
    return matches
  } catch (error: any) {
    reply.status(500)
    return { error: error.message }
  }
})

// Default avatars endpoint
fastify.get('/api/avatars/defaults', async (request, reply) => {
  return auth.getDefaultAvatars()
})

// Debug endpoint to list all users (for development only)
fastify.get('/api/debug/users', async (request, reply) => {
  const usersList = Array.from(auth.users.values()).map((user: any) => ({
    id: user.id,
    username: user.username,
    displayName: user.displayName
  }))
  return { users: usersList, count: usersList.length }
})

// Avatar upload endpoint (simplified - just accepts avatar URL)
fastify.post('/api/users/me/avatar', async (request, reply) => {
  const authResult = await authenticate(request, reply)
  if (authResult) return authResult
  
  try {
    const { avatarUrl } = request.body as { avatarUrl: string }
    if (!avatarUrl) {
      reply.status(400)
      return { error: 'Avatar URL required' }
    }
    
    const user = await auth.updateUserProfile((request as any).userId, { avatar: avatarUrl })
    return { user, avatarUrl }
  } catch (error: any) {
    reply.status(500)
    return { error: error.message }
  }
})

// Tournament endpoints
fastify.post('/api/tournaments', async (request, reply) => {
  const { name, gameType } = request.body as { name: string, gameType?: 'pong' | 'tank' }
  
  const tournament: Tournament = {
    id: uuidv4(),
    name,
    gameType: gameType || 'pong',
    players: [],
    matches: [],
    currentRound: 1,
    status: 'registration'
  }
  
  tournaments.set(tournament.id, tournament)
  return tournament
})

fastify.get('/api/tournaments', async (request, reply) => {
  const tournamentsList = Array.from(tournaments.values()).map(tournament => ({
    id: tournament.id,
    name: tournament.name,
    gameType: tournament.gameType,
    players: tournament.players.map(player => ({
      id: player.id,
      name: player.name,
      ready: player.ready,
      position: player.position
    })),
    matches: tournament.matches.map(match => ({
      id: match.id,
      player1: { id: match.player1.id, name: match.player1.name },
      player2: { id: match.player2.id, name: match.player2.name },
      winner: match.winner ? { id: match.winner.id, name: match.winner.name } : null,
      status: match.status
    })),
    currentRound: tournament.currentRound,
    status: tournament.status
  }))
  
  return tournamentsList
})

fastify.get('/api/tournaments/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  const tournament = tournaments.get(id)
  
  if (!tournament) {
    reply.status(404)
    return { error: 'Tournament not found' }
  }
  
  return {
    id: tournament.id,
    name: tournament.name,
    gameType: tournament.gameType,
    players: tournament.players.map(player => ({
      id: player.id,
      name: player.name,
      ready: player.ready,
      position: player.position
    })),
    matches: tournament.matches.map(match => ({
      id: match.id,
      player1: { id: match.player1.id, name: match.player1.name },
      player2: { id: match.player2.id, name: match.player2.name },
      winner: match.winner ? { id: match.winner.id, name: match.winner.name } : null,
      status: match.status
    })),
    currentRound: tournament.currentRound,
    status: tournament.status
  }
})

// WebSocket for game and tournament connections
fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    // Create connection object with socket and playerId storage
    const connection = { socket, playerId: null }
    
    socket.on('message', (message: any) => {
      try {
        const data = JSON.parse(message.toString())
        handleWebSocketMessage(connection, data)
      } catch (error) {
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
      }
    })

    socket.on('close', () => {
      handlePlayerDisconnect(connection)
    })
  })
})

function handleWebSocketMessage(connection: any, data: any) {
  switch (data.type) {
    case 'register_player':
      handlePlayerRegistration(connection, data)
      break
    case 'join_tournament':
      handleJoinTournament(connection, data)
      break
    case 'start_tournament':
      handleStartTournament(connection, data)
      break
    case 'join_game':
      handleJoinGame(connection, data)
      break
    case 'player_move':
      handlePlayerMove(connection, data)
      break
    case 'player_ready':
      handlePlayerReady(connection, data)
      break
    case 'tank_action':
      handleTankAction(connection, data)
      break
    default:
      connection.socket.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }))
  }
}

function handlePlayerRegistration(connection: any, data: any) {
  const player: Player = {
    id: uuidv4(),
    name: data.name,
    socket: connection.socket,
    ready: false,
    position: { x: 0, y: 50 }
  }
  
  players.set(player.id, player)
  connection.playerId = player.id
  
  console.log(`Player registered: ${player.name} (${player.id}), connection.playerId set to: ${connection.playerId}`)
  
  connection.socket.send(JSON.stringify({
    type: 'player_registered',
    player: { id: player.id, name: player.name }
  }))
}

function handleJoinTournament(connection: any, data: any) {
  const { tournamentId, playerId, playerName } = data
  const tournament = tournaments.get(tournamentId)
  
  console.log(`Join tournament request: tournamentId=${tournamentId}, playerId=${playerId}, playerName=${playerName}`)
  console.log(`Tournament exists: ${!!tournament}`)
  
  if (!tournament) {
    console.log(`Error: Tournament not found: ${tournamentId}`)
    connection.socket.send(JSON.stringify({ type: 'error', message: 'Tournament not found' }))
    return
  }
  
  if (!playerId || !playerName) {
    console.log(`Error: Player information missing`)
    connection.socket.send(JSON.stringify({ type: 'error', message: 'Player information missing' }))
    return
  }
  
  // Create or get player
  let player = players.get(playerId)
  if (!player) {
    player = { 
      id: playerId, 
      name: playerName, 
      socket: connection.socket,
      ready: false,
      position: { x: 0, y: 0 }
    }
    players.set(playerId, player)
    connection.playerId = playerId
    console.log(`Player created: ${playerName} (${playerId})`)
  }
  
  if (tournament.status !== 'registration') {
    connection.socket.send(JSON.stringify({ type: 'error', message: 'Tournament registration closed' }))
    return
  }
  
  // Check if player is already in tournament
  if (tournament.players.some(p => p.id === player.id)) {
    connection.socket.send(JSON.stringify({ type: 'error', message: 'Player already in tournament' }))
    return
  }
  
  tournament.players.push(player)
  console.log(`Player ${player.name} joined tournament ${tournament.name}`)
  
  // Broadcast updated tournament to all connected clients
  broadcastTournamentUpdate(tournament)
}

function handleStartTournament(connection: any, data: any) {
  const { tournamentId } = data
  const tournament = tournaments.get(tournamentId)
  
  console.log(`Start tournament request: tournamentId=${tournamentId}`)
  console.log(`Tournament exists: ${!!tournament}, Players: ${tournament?.players.length || 0}`)
  
  if (!tournament) {
    connection.socket.send(JSON.stringify({ type: 'error', message: 'Tournament not found' }))
    return
  }
  
  if (tournament.players.length < 2) {
    console.log(`Error: Not enough players (${tournament.players.length})`)
    connection.socket.send(JSON.stringify({ type: 'error', message: 'Need at least 2 players' }))
    return
  }
  
  tournament.status = 'playing'
  generateMatches(tournament)
  
  console.log(`Tournament started: ${tournament.name}, matches: ${tournament.matches.length}`)
  
  broadcastTournamentUpdate(tournament)
}

function generateMatches(tournament: Tournament) {
  const players = [...tournament.players]
  tournament.matches = []
  
  // Create first round matches
  for (let i = 0; i < players.length; i += 2) {
    if (i + 1 < players.length) {
      const match: Match = {
        id: uuidv4(),
        player1: players[i],
        player2: players[i + 1],
        status: 'pending'
      }
      tournament.matches.push(match)
    }
  }
}

function handleJoinGame(connection: any, data: any) {
  const { matchId, playerId, playerName } = data
  
  console.log(`Join game request: matchId=${matchId}, playerId=${playerId}, playerName=${playerName}`)
  
  if (!playerId || !playerName) {
    console.log(`Error: Player information missing`)
    connection.socket.send(JSON.stringify({ type: 'error', message: 'Player information missing' }))
    return
  }
  
  // Find tournament by match ID to determine game type
  let gameType: 'pong' | 'tank' = 'pong' // default
  let tournamentFound = false
  
  for (const tournament of tournaments.values()) {
    const match = tournament.matches.find(m => m.id === matchId)
    if (match) {
      gameType = tournament.gameType
      tournamentFound = true
      console.log(`Found match in tournament: ${tournament.name}, gameType: ${gameType}`)
      break
    }
  }
  
  if (!tournamentFound) {
    console.log(`Warning: Match ${matchId} not found in any tournament, using default gameType: ${gameType}`)
  }
  
  // Create or get player
  let player = players.get(playerId)
  if (!player) {
    player = { 
      id: playerId, 
      name: playerName, 
      socket: connection.socket,
      ready: false,
      position: { x: 0, y: 0 }
    }
    players.set(playerId, player)
    connection.playerId = playerId
    console.log(`Player created for game: ${playerName} (${playerId})`)
  }
  
  let game = games.get(matchId)
  
  if (!game) {
    console.log(`Creating new game: ${matchId} with gameType: ${gameType}`)
    game = {
      id: matchId,
      gameType: gameType,
      players: [],
      score: { player1: 0, player2: 0 },
      gameState: 'waiting'
    }
    
    // Initialize game-specific properties
    if (gameType === 'pong') {
      game.ball = { x: 50, y: 50, dx: 0.3, dy: 0.3 }
    } else if (gameType === 'tank') {
      game.tanks = {}
      game.bullets = []
    }
    
    games.set(matchId, game)
  }
  
  // Check if player already in game
  if (game.players.some(p => p.id === player.id)) {
    console.log(`Player ${player.name} already in game ${matchId}`)
  } else if (game.players.length < 2) {
    game.players.push(player)
    console.log(`Player ${player.name} joined game ${matchId}. Players: ${game.players.length}/2`)
    
    // Initialize tank data if it's a tank game
    if (gameType === 'tank' && game.tanks) {
      game.tanks[playerId] = {
        position: { x: game.players.length === 1 ? 15 : 85, y: 50, rotation: 0 },
        turretRotation: 0,
        health: 100
      }
    }
    
    if (game.players.length === 2) {
      game.gameState = 'ready'
      console.log(`Game ${matchId} ready to start - waiting for players to be ready`)
    }
  } else {
    console.log(`Game ${matchId} is full`)
    connection.socket.send(JSON.stringify({ type: 'error', message: 'Game is full' }))
    return
  }
  
  broadcastGameUpdate(game)
}

function handlePlayerMove(connection: any, data: any) {
  const { gameId, playerId, playerName, position } = data
  const game = games.get(gameId)
  
  console.log(`Player move: gameId=${gameId}, playerId=${playerId}, position=${JSON.stringify(position)}`)
  
  if (!game) {
    console.log(`Game not found: ${gameId}`)
    return
  }
  
  if (!playerId || !position) {
    console.log(`Invalid move data: playerId=${playerId}, position=${JSON.stringify(position)}`)
    return
  }
  
  // Create or get player
  let player = players.get(playerId)
  if (!player && playerName) {
    player = { 
      id: playerId, 
      name: playerName, 
      socket: connection.socket,
      ready: false,
      position: { x: 0, y: 0 }
    }
    players.set(playerId, player)
    connection.playerId = playerId
    console.log(`Player created for move: ${playerName} (${playerId})`)
  }
  
  if (!player) {
    console.log(`Player not found: ${playerId}`)
    return
  }
  
  const playerInGame = game.players.find(p => p.id === player.id)
  if (playerInGame) {
    playerInGame.position = position
    player.position = position
    console.log(`Updated player position: ${player.name} -> ${JSON.stringify(position)}`)
    broadcastGameUpdate(game)
  } else {
    console.log(`Player ${player.name} not found in game ${gameId}`)
  }
}

function handlePlayerReady(connection: any, data: any) {
  const { gameId, playerId, playerName } = data
  const game = games.get(gameId)
  
  console.log(`Player ready request: gameId=${gameId}, playerId=${playerId}, playerName=${playerName}`)
  console.log(`Game exists: ${!!game}`)
  
  if (!game) {
    console.log(`Error: Game not found: ${gameId}`)
    connection.socket.send(JSON.stringify({ type: 'error', message: 'Game not found' }))
    return
  }
  
  if (!playerId || !playerName) {
    console.log(`Error: Player information missing`)
    connection.socket.send(JSON.stringify({ type: 'error', message: 'Player information missing' }))
    return
  }
  
  // Create or get player
  let player = players.get(playerId)
  if (!player) {
    player = { 
      id: playerId, 
      name: playerName, 
      socket: connection.socket,
      ready: false,
      position: { x: 0, y: 0 }
    }
    players.set(playerId, player)
    connection.playerId = playerId
    console.log(`Player created for ready: ${playerName} (${playerId})`)
  }
  
  const playerInGame = game.players.find(p => p.id === player.id)
  if (playerInGame) {
    playerInGame.ready = true
    console.log(`Player ${player.name} is ready. Ready players: ${game.players.filter(p => p.ready).length}/${game.players.length}`)
    
    // Only start game if we have exactly 2 players and both are ready
    if (game.players.length === 2 && game.players.every(p => p.ready)) {
      console.log(`All players ready! Starting game ${gameId}`)
      startGame(game)
    } else if (game.players.length < 2) {
      console.log(`Cannot start game - only ${game.players.length} player(s). Waiting for more players.`)
    } else {
      console.log(`Waiting for all players to be ready: ${game.players.filter(p => p.ready).length}/${game.players.length}`)
    }
    
    broadcastGameUpdate(game)
  } else {
    console.log(`Player ${player.name} not found in game ${gameId}`)
    connection.socket.send(JSON.stringify({ type: 'error', message: 'Player not in game' }))
  }
}

function handleTankAction(connection: any, data: any) {
  const { gameId, playerId, playerName, action } = data
  const game = games.get(gameId)
  
  console.log(`Tank action: gameId=${gameId}, playerId=${playerId}, action=${JSON.stringify(action)}`)
  
  if (!game || game.gameType !== 'tank') {
    console.log(`Game not found or not a tank game: ${gameId}`)
    return
  }
  
  if (!playerId || !action) {
    console.log(`Invalid tank action data: playerId=${playerId}, action=${JSON.stringify(action)}`)
    return
  }
  
  // Create or get player
  let player = players.get(playerId)
  if (!player && playerName) {
    player = { 
      id: playerId, 
      name: playerName, 
      socket: connection.socket,
      ready: false,
      position: { x: 0, y: 0 }
    }
    players.set(playerId, player)
    connection.playerId = playerId
    console.log(`Player created for tank action: ${playerName} (${playerId})`)
  }
  
  if (!player) {
    console.log(`Player not found: ${playerId}`)
    return
  }
  
  const playerInGame = game.players.find(p => p.id === player.id)
  if (!playerInGame) {
    console.log(`Player ${player.name} not found in game ${gameId}`)
    return
  }
  
  // Update tank data
  if (!game.tanks) game.tanks = {}
  if (!game.tanks[playerId]) {
    game.tanks[playerId] = {
      position: { x: 50, y: 50, rotation: 0 },
      turretRotation: 0,
      health: 100
    }
  }
  
  // Update tank position and turret rotation
  if (action.position) {
    game.tanks[playerId].position = action.position
    player.position = { x: action.position.x, y: action.position.y }
  }
  
  if (action.turretRotation !== undefined) {
    game.tanks[playerId].turretRotation = action.turretRotation
  }
  
  // Handle shooting
  if (action.shoot && game.bullets) {
    const tank = game.tanks[playerId]
    const bulletId = require('uuid').v4()
    
    // Calculate bullet direction based on tank and turret rotation
    const totalRotation = tank.position.rotation + tank.turretRotation
    const bulletSpeed = 2
    
    const bullet = {
      id: bulletId,
      x: tank.position.x,
      y: tank.position.y,
      dx: Math.sin(totalRotation) * bulletSpeed,
      dy: -Math.cos(totalRotation) * bulletSpeed,
      ownerId: playerId
    }
    
    game.bullets.push(bullet)
    console.log(`Tank ${playerId} fired bullet ${bulletId}`)
  }
  
  broadcastGameUpdate(game)
}

function startGame(game: Game) {
  console.log(`Starting game: ${game.id}`)
  game.gameState = 'playing'
  
  const gameLoop = setInterval(() => {
    updateGameState(game)
    broadcastGameUpdate(game)
    
    if (game.gameState === 'finished') {
      console.log(`Game finished: ${game.id}`)
      clearInterval(gameLoop)
    }
  }, 1000 / 30) // 30 FPS - より安定した速度
}

function updateGameState(game: Game) {
  if (game.gameState !== 'playing') return
  
  if (game.gameType === 'pong' && game.ball) {
    updatePongGameState(game)
  } else if (game.gameType === 'tank') {
    updateTankGameState(game)
  }
}

function updatePongGameState(game: Game) {
  if (!game.ball) return
  
  // Update ball position
  game.ball.x += game.ball.dx
  game.ball.y += game.ball.dy
  
  // Ball collision with walls
  if (game.ball.y <= 0 || game.ball.y >= 100) {
    game.ball.dy = -game.ball.dy
  }
  
  // Ball collision with paddles
  const player1 = game.players[0]
  const player2 = game.players[1]
  
  // Left paddle (player1) - larger hit area
  if (player1 && game.ball.x <= 10 && game.ball.x >= 5 &&
      game.ball.y >= player1.position.y - 10 && 
      game.ball.y <= player1.position.y + 10) {
    game.ball.dx = Math.abs(game.ball.dx * 1.05) // Slightly increase speed
    // Add angle variation based on where ball hits paddle
    const hitPosition = (game.ball.y - player1.position.y) / 10
    game.ball.dy += hitPosition * 0.1
  }
  
  // Right paddle (player2) - larger hit area  
  if (player2 && game.ball.x >= 90 && game.ball.x <= 95 &&
      game.ball.y >= player2.position.y - 10 && 
      game.ball.y <= player2.position.y + 10) {
    game.ball.dx = -Math.abs(game.ball.dx * 1.05) // Slightly increase speed
    // Add angle variation based on where ball hits paddle
    const hitPosition = (game.ball.y - player2.position.y) / 10
    game.ball.dy += hitPosition * 0.1
  }
  
  // Score points
  if (game.ball.x <= 0) {
    game.score.player2++
    resetBall(game)
  } else if (game.ball.x >= 100) {
    game.score.player1++
    resetBall(game)
  }
  
  // Check win condition (first to 3 points wins)
  if (game.score.player1 >= 3 || game.score.player2 >= 3) {
    game.gameState = 'finished'
    recordMatchHistory(game)
  }
}

function updateTankGameState(game: Game) {
  if (!game.bullets) return
  
  // Update bullet positions
  game.bullets = game.bullets.filter(bullet => {
    bullet.x += bullet.dx
    bullet.y += bullet.dy
    
    // Remove bullets that are out of bounds
    if (bullet.x < 0 || bullet.x > 100 || bullet.y < 0 || bullet.y > 100) {
      return false
    }
    
    // Check bullet collision with tanks
    if (game.tanks) {
      for (const [playerId, tank] of Object.entries(game.tanks)) {
        if (playerId === bullet.ownerId) continue // Can't hit yourself
        
        const distance = Math.sqrt(
          Math.pow(bullet.x - tank.position.x, 2) + 
          Math.pow(bullet.y - tank.position.y, 2)
        )
        
        if (distance < 3) { // Hit detection radius
          tank.health -= 25
          console.log(`Tank ${playerId} hit! Health: ${tank.health}`)
          
          if (tank.health <= 0) {
            // Player with the destroyed tank loses
            const destroyedPlayerIndex = game.players.findIndex(p => p.id === playerId)
            if (destroyedPlayerIndex === 0) {
              game.score.player2++
            } else {
              game.score.player1++
            }
            
            // Reset tank health for next round
            tank.health = 100
            
            // Check win condition (first to 3 points wins)
            if (game.score.player1 >= 3 || game.score.player2 >= 3) {
              game.gameState = 'finished'
              recordMatchHistory(game)
            }
          }
          
          return false // Remove bullet
        }
      }
    }
    
    return true // Keep bullet
  })
}

function recordMatchHistory(game: Game) {
  // Record match in history if both players are registered users
  if (game.players.length === 2) {
    const player1 = game.players[0]
    const player2 = game.players[1]
    
    // Find actual user IDs from registered players
    let player1UserId: string | null = null
    let player2UserId: string | null = null
    
    for (const [userId, player] of players.entries()) {
      if (player.id === player1.id) player1UserId = userId
      if (player.id === player2.id) player2UserId = userId
    }
    
    if (player1UserId && player2UserId) {
      const winnerId = game.score.player1 > game.score.player2 ? player1UserId : player2UserId
      
      auth.addMatchToHistory({
        player1Id: player1UserId,
        player2Id: player2UserId,
        winnerId,
        score: game.score,
        playedAt: new Date()
      }).catch(console.error)
    }
  }
}

function resetBall(game: Game) {
  if (!game.ball) return
  
  game.ball.x = 50
  game.ball.y = 50
  game.ball.dx = Math.random() > 0.5 ? 0.3 : -0.3
  game.ball.dy = Math.random() > 0.5 ? 0.3 : -0.3
}

function broadcastGameUpdate(game: Game) {
  const gameUpdateData: any = {
    type: 'game_update',
    game: {
      id: game.id,
      gameType: game.gameType,
      players: game.players.map(p => ({ 
        id: p.id, 
        name: p.name, 
        position: p.position, 
        ready: p.ready,
        turretRotation: game.tanks?.[p.id]?.turretRotation || 0
      })),
      score: game.score,
      gameState: game.gameState
    }
  }
  
  // Add game-specific data
  if (game.gameType === 'pong' && game.ball) {
    gameUpdateData.game.ball = game.ball
  } else if (game.gameType === 'tank') {
    gameUpdateData.game.tanks = game.tanks
    gameUpdateData.game.bullets = game.bullets
  }
  
  const gameData = JSON.stringify(gameUpdateData)
  
  game.players.forEach(player => {
    if (player.socket.readyState === 1) {
      player.socket.send(gameData)
    }
  })
}

function broadcastTournamentUpdate(tournament: Tournament) {
  const tournamentData = JSON.stringify({
    type: 'tournament_update',
    tournament: {
      id: tournament.id,
      name: tournament.name,
      gameType: tournament.gameType,
      players: tournament.players.map(p => ({ id: p.id, name: p.name })),
      matches: tournament.matches.map(m => ({
        id: m.id,
        player1: { id: m.player1.id, name: m.player1.name },
        player2: { id: m.player2.id, name: m.player2.name },
        winner: m.winner ? { id: m.winner.id, name: m.winner.name } : null,
        status: m.status
      })),
      currentRound: tournament.currentRound,
      status: tournament.status
    }
  })
  
  tournament.players.forEach(player => {
    if (player.socket.readyState === 1) {
      player.socket.send(tournamentData)
    }
  })
}

function handlePlayerDisconnect(connection: any) {
  if (connection.playerId) {
    const player = players.get(connection.playerId)
    if (player) {
      players.delete(connection.playerId)
      
      // Remove player from games and tournaments
      games.forEach(game => {
        const index = game.players.findIndex(p => p.id === player.id)
        if (index !== -1) {
          game.players.splice(index, 1)
          if (game.players.length === 0) {
            games.delete(game.id)
          }
        }
      })
    }
  }
}

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    console.log('Server listening on port 3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()