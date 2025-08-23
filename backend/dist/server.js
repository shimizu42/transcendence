"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const cors_1 = __importDefault(require("@fastify/cors"));
const uuid_1 = require("uuid");
const fastify = (0, fastify_1.default)({
    logger: true
});
// Store active games and tournaments
const games = new Map();
const tournaments = new Map();
const players = new Map();
// Register plugins
fastify.register(cors_1.default, {
    origin: true
});
fastify.register(websocket_1.default);
// Health check endpoint
fastify.get('/health', async (request, reply) => {
    return { status: 'ok' };
});
// Tournament endpoints
fastify.post('/api/tournaments', async (request, reply) => {
    const { name } = request.body;
    const tournament = {
        id: (0, uuid_1.v4)(),
        name,
        players: [],
        matches: [],
        currentRound: 1,
        status: 'registration'
    };
    tournaments.set(tournament.id, tournament);
    return tournament;
});
fastify.get('/api/tournaments', async (request, reply) => {
    const tournamentsList = Array.from(tournaments.values()).map(tournament => ({
        id: tournament.id,
        name: tournament.name,
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
    }));
    return tournamentsList;
});
fastify.get('/api/tournaments/:id', async (request, reply) => {
    const { id } = request.params;
    const tournament = tournaments.get(id);
    if (!tournament) {
        reply.status(404);
        return { error: 'Tournament not found' };
    }
    return {
        id: tournament.id,
        name: tournament.name,
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
    };
});
// WebSocket for game and tournament connections
fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (socket, req) => {
        // Create connection object with socket and playerId storage
        const connection = { socket, playerId: null };
        socket.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                handleWebSocketMessage(connection, data);
            }
            catch (error) {
                socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
            }
        });
        socket.on('close', () => {
            handlePlayerDisconnect(connection);
        });
    });
});
function handleWebSocketMessage(connection, data) {
    switch (data.type) {
        case 'register_player':
            handlePlayerRegistration(connection, data);
            break;
        case 'join_tournament':
            handleJoinTournament(connection, data);
            break;
        case 'start_tournament':
            handleStartTournament(connection, data);
            break;
        case 'join_game':
            handleJoinGame(connection, data);
            break;
        case 'player_move':
            handlePlayerMove(connection, data);
            break;
        case 'player_ready':
            handlePlayerReady(connection, data);
            break;
        default:
            connection.socket.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
}
function handlePlayerRegistration(connection, data) {
    const player = {
        id: (0, uuid_1.v4)(),
        name: data.name,
        socket: connection.socket,
        ready: false,
        position: { x: 0, y: 50 }
    };
    players.set(player.id, player);
    connection.playerId = player.id;
    console.log(`Player registered: ${player.name} (${player.id}), connection.playerId set to: ${connection.playerId}`);
    connection.socket.send(JSON.stringify({
        type: 'player_registered',
        player: { id: player.id, name: player.name }
    }));
}
function handleJoinTournament(connection, data) {
    const { tournamentId } = data;
    const tournament = tournaments.get(tournamentId);
    const player = players.get(connection.playerId);
    console.log(`Join tournament request: tournamentId=${tournamentId}, playerId=${connection.playerId}`);
    console.log(`Tournament exists: ${!!tournament}, Player exists: ${!!player}`);
    if (!tournament || !player) {
        console.log(`Error: Tournament or player not found. Tournament: ${tournament?.id}, Player: ${player?.id}`);
        connection.socket.send(JSON.stringify({ type: 'error', message: 'Tournament or player not found' }));
        return;
    }
    if (tournament.status !== 'registration') {
        connection.socket.send(JSON.stringify({ type: 'error', message: 'Tournament registration closed' }));
        return;
    }
    // Check if player is already in tournament
    if (tournament.players.some(p => p.id === player.id)) {
        connection.socket.send(JSON.stringify({ type: 'error', message: 'Player already in tournament' }));
        return;
    }
    tournament.players.push(player);
    console.log(`Player ${player.name} joined tournament ${tournament.name}`);
    // Broadcast updated tournament to all connected clients
    broadcastTournamentUpdate(tournament);
}
function handleStartTournament(connection, data) {
    const { tournamentId } = data;
    const tournament = tournaments.get(tournamentId);
    console.log(`Start tournament request: tournamentId=${tournamentId}`);
    console.log(`Tournament exists: ${!!tournament}, Players: ${tournament?.players.length || 0}`);
    if (!tournament) {
        connection.socket.send(JSON.stringify({ type: 'error', message: 'Tournament not found' }));
        return;
    }
    if (tournament.players.length < 2) {
        console.log(`Error: Not enough players (${tournament.players.length})`);
        connection.socket.send(JSON.stringify({ type: 'error', message: 'Need at least 2 players' }));
        return;
    }
    tournament.status = 'playing';
    generateMatches(tournament);
    console.log(`Tournament started: ${tournament.name}, matches: ${tournament.matches.length}`);
    broadcastTournamentUpdate(tournament);
}
function generateMatches(tournament) {
    const players = [...tournament.players];
    tournament.matches = [];
    // Create first round matches
    for (let i = 0; i < players.length; i += 2) {
        if (i + 1 < players.length) {
            const match = {
                id: (0, uuid_1.v4)(),
                player1: players[i],
                player2: players[i + 1],
                status: 'pending'
            };
            tournament.matches.push(match);
        }
    }
}
function handleJoinGame(connection, data) {
    const { matchId } = data;
    const player = players.get(connection.playerId);
    console.log(`Join game request: matchId=${matchId}, playerId=${connection.playerId}`);
    if (!player) {
        console.log(`Error: Player not found for ID: ${connection.playerId}`);
        connection.socket.send(JSON.stringify({ type: 'error', message: 'Player not found' }));
        return;
    }
    let game = games.get(matchId);
    if (!game) {
        console.log(`Creating new game: ${matchId}`);
        game = {
            id: matchId,
            players: [],
            ball: { x: 50, y: 50, dx: 0.3, dy: 0.3 },
            score: { player1: 0, player2: 0 },
            gameState: 'waiting'
        };
        games.set(matchId, game);
    }
    // Check if player already in game
    if (game.players.some(p => p.id === player.id)) {
        console.log(`Player ${player.name} already in game ${matchId}`);
    }
    else if (game.players.length < 2) {
        game.players.push(player);
        console.log(`Player ${player.name} joined game ${matchId}. Players: ${game.players.length}/2`);
        if (game.players.length === 2) {
            game.gameState = 'ready';
            console.log(`Game ${matchId} ready to start - waiting for players to be ready`);
        }
    }
    else {
        console.log(`Game ${matchId} is full`);
        connection.socket.send(JSON.stringify({ type: 'error', message: 'Game is full' }));
        return;
    }
    broadcastGameUpdate(game);
}
function handlePlayerMove(connection, data) {
    const { gameId, position } = data;
    const game = games.get(gameId);
    const player = players.get(connection.playerId);
    if (!game || !player)
        return;
    const playerInGame = game.players.find(p => p.id === player.id);
    if (playerInGame) {
        playerInGame.position = position;
        broadcastGameUpdate(game);
    }
}
function handlePlayerReady(connection, data) {
    const { gameId } = data;
    const game = games.get(gameId);
    const player = players.get(connection.playerId);
    console.log(`Player ready request: gameId=${gameId}, playerId=${connection.playerId}`);
    console.log(`Game exists: ${!!game}, Player exists: ${!!player}`);
    if (!game || !player) {
        console.log(`Error: Game or player not found`);
        connection.socket.send(JSON.stringify({ type: 'error', message: 'Game or player not found' }));
        return;
    }
    const playerInGame = game.players.find(p => p.id === player.id);
    if (playerInGame) {
        playerInGame.ready = true;
        console.log(`Player ${player.name} is ready. Ready players: ${game.players.filter(p => p.ready).length}/${game.players.length}`);
        // Only start game if we have exactly 2 players and both are ready
        if (game.players.length === 2 && game.players.every(p => p.ready)) {
            console.log(`All players ready! Starting game ${gameId}`);
            startGame(game);
        }
        else if (game.players.length < 2) {
            console.log(`Cannot start game - only ${game.players.length} player(s). Waiting for more players.`);
        }
        else {
            console.log(`Waiting for all players to be ready: ${game.players.filter(p => p.ready).length}/${game.players.length}`);
        }
        broadcastGameUpdate(game);
    }
    else {
        console.log(`Player ${player.name} not found in game ${gameId}`);
        connection.socket.send(JSON.stringify({ type: 'error', message: 'Player not in game' }));
    }
}
function startGame(game) {
    console.log(`Starting game: ${game.id}`);
    game.gameState = 'playing';
    const gameLoop = setInterval(() => {
        updateGameState(game);
        broadcastGameUpdate(game);
        if (game.gameState === 'finished') {
            console.log(`Game finished: ${game.id}`);
            clearInterval(gameLoop);
        }
    }, 1000 / 30); // 30 FPS - より安定した速度
}
function updateGameState(game) {
    if (game.gameState !== 'playing')
        return;
    // Update ball position
    game.ball.x += game.ball.dx;
    game.ball.y += game.ball.dy;
    // Ball collision with walls
    if (game.ball.y <= 0 || game.ball.y >= 100) {
        game.ball.dy = -game.ball.dy;
    }
    // Ball collision with paddles
    const player1 = game.players[0];
    const player2 = game.players[1];
    // Left paddle (player1) - larger hit area
    if (player1 && game.ball.x <= 10 && game.ball.x >= 5 &&
        game.ball.y >= player1.position.y - 10 &&
        game.ball.y <= player1.position.y + 10) {
        game.ball.dx = Math.abs(game.ball.dx * 1.05); // Slightly increase speed
        // Add angle variation based on where ball hits paddle
        const hitPosition = (game.ball.y - player1.position.y) / 10;
        game.ball.dy += hitPosition * 0.1;
    }
    // Right paddle (player2) - larger hit area  
    if (player2 && game.ball.x >= 90 && game.ball.x <= 95 &&
        game.ball.y >= player2.position.y - 10 &&
        game.ball.y <= player2.position.y + 10) {
        game.ball.dx = -Math.abs(game.ball.dx * 1.05); // Slightly increase speed
        // Add angle variation based on where ball hits paddle
        const hitPosition = (game.ball.y - player2.position.y) / 10;
        game.ball.dy += hitPosition * 0.1;
    }
    // Score points
    if (game.ball.x <= 0) {
        game.score.player2++;
        resetBall(game);
    }
    else if (game.ball.x >= 100) {
        game.score.player1++;
        resetBall(game);
    }
    // Check win condition (first to 3 points wins)
    if (game.score.player1 >= 3 || game.score.player2 >= 3) {
        game.gameState = 'finished';
    }
}
function resetBall(game) {
    game.ball.x = 50;
    game.ball.y = 50;
    game.ball.dx = Math.random() > 0.5 ? 0.3 : -0.3;
    game.ball.dy = Math.random() > 0.5 ? 0.3 : -0.3;
}
function broadcastGameUpdate(game) {
    const gameData = JSON.stringify({
        type: 'game_update',
        game: {
            id: game.id,
            players: game.players.map(p => ({ id: p.id, name: p.name, position: p.position, ready: p.ready })),
            ball: game.ball,
            score: game.score,
            gameState: game.gameState
        }
    });
    game.players.forEach(player => {
        if (player.socket.readyState === 1) {
            player.socket.send(gameData);
        }
    });
}
function broadcastTournamentUpdate(tournament) {
    const tournamentData = JSON.stringify({
        type: 'tournament_update',
        tournament: {
            id: tournament.id,
            name: tournament.name,
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
    });
    tournament.players.forEach(player => {
        if (player.socket.readyState === 1) {
            player.socket.send(tournamentData);
        }
    });
}
function handlePlayerDisconnect(connection) {
    if (connection.playerId) {
        const player = players.get(connection.playerId);
        if (player) {
            players.delete(connection.playerId);
            // Remove player from games and tournaments
            games.forEach(game => {
                const index = game.players.findIndex(p => p.id === player.id);
                if (index !== -1) {
                    game.players.splice(index, 1);
                    if (game.players.length === 0) {
                        games.delete(game.id);
                    }
                }
            });
        }
    }
}
const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
        console.log('Server listening on port 3000');
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
