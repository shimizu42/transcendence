// Combined TypeScript file for Pong Tournament Application

// Security utilities
class SecurityUtils {
    static sanitizeHTML(input: string): string {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    static validatePlayerName(name: string): { isValid: boolean, sanitized: string, error?: string } {
        if (!name || typeof name !== 'string') {
            return { isValid: false, sanitized: '', error: 'Name is required' };
        }

        const trimmed = name.trim();
        
        if (trimmed.length === 0) {
            return { isValid: false, sanitized: '', error: 'Name cannot be empty' };
        }

        if (trimmed.length > 20) {
            return { isValid: false, sanitized: '', error: 'Name must be 20 characters or less' };
        }

        const dangerousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i,
            /<object/i,
            /<embed/i
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(trimmed)) {
                return { isValid: false, sanitized: '', error: 'Invalid characters in name' };
            }
        }

        const sanitized = this.sanitizeHTML(trimmed);
        return { isValid: true, sanitized };
    }

    static createRateLimiter(maxAttempts: number, windowMs: number) {
        const attempts = new Map<string, { count: number; resetTime: number }>();

        return {
            isAllowed(identifier: string): boolean {
                const now = Date.now();
                const record = attempts.get(identifier);

                if (!record || now > record.resetTime) {
                    attempts.set(identifier, { count: 1, resetTime: now + windowMs });
                    return true;
                }

                if (record.count >= maxAttempts) {
                    return false;
                }

                record.count++;
                return true;
            }
        };
    }

    static logSecurityEvent(event: string, details: any = {}): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            details,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        console.warn('Security Event:', logEntry);
    }

    static constantTimeDelay(minMs: number = 100): Promise<void> {
        const delay = minMs + Math.random() * 50;
        return new Promise(resolve => setTimeout(resolve, delay));
    }
}

// Tournament interfaces and classes
interface TournamentPlayer {
    id: string;
    name: string;
    isEliminated: boolean;
}

interface Match {
    id: string;
    player1: TournamentPlayer | null;
    player2: TournamentPlayer | null;
    winner: TournamentPlayer | null;
    round: number;
    isPlayed: boolean;
}

interface TournamentState {
    players: TournamentPlayer[];
    matches: Match[];
    currentRound: number;
    isComplete: boolean;
    winner: TournamentPlayer | null;
}

class Tournament {
    private state: TournamentState;
    private onStateChange?: (state: TournamentState) => void;

    constructor() {
        this.state = {
            players: [],
            matches: [],
            currentRound: 1,
            isComplete: false,
            winner: null
        };
    }

    public addPlayer(name: string): boolean {
        if (!name || name.trim().length === 0) {
            return false;
        }

        const trimmedName = name.trim();
        
        if (this.state.players.some(p => p.name === trimmedName)) {
            return false;
        }

        const player: TournamentPlayer = {
            id: Math.random().toString(36).substr(2, 9),
            name: trimmedName,
            isEliminated: false
        };

        this.state.players.push(player);
        this.notifyStateChange();
        return true;
    }

    public removePlayer(playerId: string): boolean {
        const index = this.state.players.findIndex(p => p.id === playerId);
        if (index === -1) {
            return false;
        }

        this.state.players.splice(index, 1);
        this.notifyStateChange();
        return true;
    }

    public startTournament(): boolean {
        if (this.state.players.length < 2) {
            return false;
        }

        this.generateBracket();
        this.notifyStateChange();
        return true;
    }

    private generateBracket(): void {
        const players = [...this.state.players];
        
        // Shuffle players
        for (let i = players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [players[i], players[j]] = [players[j], players[i]];
        }
        
        this.state.matches = [];
        let matchId = 1;
        
        for (let i = 0; i < players.length; i += 2) {
            const match: Match = {
                id: matchId.toString(),
                player1: players[i],
                player2: players[i + 1] || null,
                winner: null,
                round: 1,
                isPlayed: false
            };
            
            if (!match.player2) {
                match.winner = match.player1;
                match.isPlayed = true;
            }
            
            this.state.matches.push(match);
            matchId++;
        }
        
        this.generateSubsequentRounds();
    }

    private generateSubsequentRounds(): void {
        let currentRoundMatches = this.state.matches.filter(m => m.round === 1);
        let round = 2;
        let matchId = this.state.matches.length + 1;
        
        while (currentRoundMatches.length > 1) {
            const nextRoundMatches: Match[] = [];
            
            for (let i = 0; i < currentRoundMatches.length; i += 2) {
                const match: Match = {
                    id: matchId.toString(),
                    player1: null,
                    player2: null,
                    winner: null,
                    round: round,
                    isPlayed: false
                };
                
                nextRoundMatches.push(match);
                this.state.matches.push(match);
                matchId++;
            }
            
            currentRoundMatches = nextRoundMatches;
            round++;
        }
    }

    public getNextMatch(): Match | null {
        const playableMatches = this.state.matches.filter(match => {
            if (match.isPlayed) return false;
            return this.arePrerequisiteMatchesCompleted(match);
        });

        return playableMatches.length > 0 ? playableMatches[0] : null;
    }

    private arePrerequisiteMatchesCompleted(match: Match): boolean {
        if (match.round === 1) {
            return true;
        }

        const previousRoundMatches = this.state.matches.filter(m => m.round === match.round - 1);
        const matchIndex = this.state.matches
            .filter(m => m.round === match.round)
            .findIndex(m => m.id === match.id);
            
        const feedingMatch1 = previousRoundMatches[matchIndex * 2];
        const feedingMatch2 = previousRoundMatches[matchIndex * 2 + 1];
        
        if (feedingMatch1 && !feedingMatch1.isPlayed) return false;
        if (feedingMatch2 && !feedingMatch2.isPlayed) return false;
        
        if (!match.player1 && feedingMatch1?.winner) {
            match.player1 = feedingMatch1.winner;
        }
        if (!match.player2 && feedingMatch2?.winner) {
            match.player2 = feedingMatch2.winner;
        }
        
        return true;
    }

    public recordMatchResult(matchId: string, winnerId: string): boolean {
        const match = this.state.matches.find(m => m.id === matchId);
        if (!match || match.isPlayed) {
            return false;
        }

        let winner: TournamentPlayer | null = null;
        if (match.player1?.id === winnerId) {
            winner = match.player1;
        } else if (match.player2?.id === winnerId) {
            winner = match.player2;
        }

        if (!winner) {
            return false;
        }

        match.winner = winner;
        match.isPlayed = true;

        if (match.player1 && match.player1.id !== winnerId) {
            match.player1.isEliminated = true;
        }
        if (match.player2 && match.player2.id !== winnerId) {
            match.player2.isEliminated = true;
        }

        this.checkTournamentCompletion();
        this.notifyStateChange();
        return true;
    }

    private checkTournamentCompletion(): void {
        const finalMatch = this.state.matches
            .filter(m => m.round === Math.max(...this.state.matches.map(match => match.round)))
            .find(m => m.isPlayed);

        if (finalMatch?.winner) {
            this.state.isComplete = true;
            this.state.winner = finalMatch.winner;
        }
    }

    public getState(): TournamentState {
        return { ...this.state };
    }

    public setOnStateChange(callback: (state: TournamentState) => void): void {
        this.onStateChange = callback;
    }

    private notifyStateChange(): void {
        if (this.onStateChange) {
            this.onStateChange(this.getState());
        }
    }

    public getBracketDisplay(): { round: number; matches: Match[] }[] {
        const rounds: { round: number; matches: Match[] }[] = [];
        const maxRound = Math.max(...this.state.matches.map(m => m.round));
        
        for (let round = 1; round <= maxRound; round++) {
            const roundMatches = this.state.matches.filter(m => m.round === round);
            rounds.push({ round, matches: roundMatches });
        }
        
        return rounds;
    }
}

// Pong Game classes
interface Player {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    score: number;
    name: string;
}

interface Ball {
    x: number;
    y: number;
    radius: number;
    speedX: number;
    speedY: number;
}

interface GameState {
    player1: Player;
    player2: Player;
    ball: Ball;
    isRunning: boolean;
    gameWidth: number;
    gameHeight: number;
    maxScore: number;
    winner: string | null;
}

class PongGame {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private gameState: GameState;
    private keys: { [key: string]: boolean } = {};
    private animationId: number | null = null;
    private onGameEnd?: (winner: string) => void;

    constructor(canvas: HTMLCanvasElement, player1Name: string = "Player 1", player2Name: string = "Player 2") {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Unable to get 2D context from canvas');
        }
        this.ctx = context;

        this.gameState = {
            gameWidth: canvas.width,
            gameHeight: canvas.height,
            maxScore: 5,
            winner: null,
            isRunning: false,
            player1: {
                x: 20,
                y: canvas.height / 2 - 50,
                width: 10,
                height: 100,
                speed: 5,
                score: 0,
                name: player1Name
            },
            player2: {
                x: canvas.width - 30,
                y: canvas.height / 2 - 50,
                width: 10,
                height: 100,
                speed: 5,
                score: 0,
                name: player2Name
            },
            ball: {
                x: canvas.width / 2,
                y: canvas.height / 2,
                radius: 8,
                speedX: 4,
                speedY: 3
            }
        };

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key === ' ' && !this.gameState.isRunning && !this.gameState.winner) {
                this.start();
            }
            
            if (e.key.toLowerCase() === 'r' && this.gameState.winner) {
                this.reset();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    public start(): void {
        if (this.gameState.isRunning) return;
        
        this.gameState.isRunning = true;
        this.gameLoop();
    }

    public pause(): void {
        this.gameState.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    public reset(): void {
        this.pause();
        
        this.gameState.player1.y = this.canvas.height / 2 - 50;
        this.gameState.player2.y = this.canvas.height / 2 - 50;
        this.gameState.ball.x = this.canvas.width / 2;
        this.gameState.ball.y = this.canvas.height / 2;
        
        this.gameState.player1.score = 0;
        this.gameState.player2.score = 0;
        
        this.gameState.ball.speedX = Math.random() > 0.5 ? 4 : -4;
        this.gameState.ball.speedY = (Math.random() - 0.5) * 6;
        
        this.gameState.winner = null;
        this.gameState.isRunning = false;
        
        this.draw();
    }

    private gameLoop(): void {
        if (!this.gameState.isRunning) return;

        this.update();
        this.draw();

        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    private update(): void {
        this.updatePlayers();
        this.updateBall();
        this.checkCollisions();
        this.checkWinCondition();
    }

    private updatePlayers(): void {
        const { player1, player2, gameHeight } = this.gameState;
        
        if (this.keys['w'] && player1.y > 0) {
            player1.y -= player1.speed;
        }
        if (this.keys['s'] && player1.y < gameHeight - player1.height) {
            player1.y += player1.speed;
        }
        
        if (this.keys['arrowup'] && player2.y > 0) {
            player2.y -= player2.speed;
        }
        if (this.keys['arrowdown'] && player2.y < gameHeight - player2.height) {
            player2.y += player2.speed;
        }
    }

    private updateBall(): void {
        const { ball } = this.gameState;
        
        ball.x += ball.speedX;
        ball.y += ball.speedY;
        
        if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= this.gameState.gameHeight) {
            ball.speedY = -ball.speedY;
        }
    }

    private checkCollisions(): void {
        const { ball, player1, player2 } = this.gameState;
        
        if (ball.x - ball.radius <= player1.x + player1.width &&
            ball.y >= player1.y &&
            ball.y <= player1.y + player1.height &&
            ball.speedX < 0) {
            
            ball.speedX = -ball.speedX;
            const hitPos = (ball.y - player1.y) / player1.height;
            ball.speedY = (hitPos - 0.5) * 10;
        }
        
        if (ball.x + ball.radius >= player2.x &&
            ball.y >= player2.y &&
            ball.y <= player2.y + player2.height &&
            ball.speedX > 0) {
            
            ball.speedX = -ball.speedX;
            const hitPos = (ball.y - player2.y) / player2.height;
            ball.speedY = (hitPos - 0.5) * 10;
        }
    }

    private checkWinCondition(): void {
        const { ball, player1, player2, gameWidth, maxScore } = this.gameState;
        
        if (ball.x < 0) {
            player2.score++;
            this.resetBall();
        }
        
        if (ball.x > gameWidth) {
            player1.score++;
            this.resetBall();
        }
        
        if (player1.score >= maxScore) {
            this.gameState.winner = player1.name;
            this.gameState.isRunning = false;
            if (this.onGameEnd) {
                this.onGameEnd(player1.name);
            }
        } else if (player2.score >= maxScore) {
            this.gameState.winner = player2.name;
            this.gameState.isRunning = false;
            if (this.onGameEnd) {
                this.onGameEnd(player2.name);
            }
        }
    }

    private resetBall(): void {
        const { ball, gameWidth, gameHeight } = this.gameState;
        
        ball.x = gameWidth / 2;
        ball.y = gameHeight / 2;
        ball.speedX = Math.random() > 0.5 ? 4 : -4;
        ball.speedY = (Math.random() - 0.5) * 6;
    }

    private draw(): void {
        const { ctx } = this;
        const { player1, player2, ball, gameWidth, gameHeight } = this.gameState;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, gameWidth, gameHeight);
        
        ctx.strokeStyle = '#fff';
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(gameWidth / 2, 0);
        ctx.lineTo(gameWidth / 2, gameHeight);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = '#fff';
        ctx.fillRect(player1.x, player1.y, player1.width, player1.height);
        ctx.fillRect(player2.x, player2.y, player2.width, player2.height);
        
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.font = '30px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(player1.score.toString(), gameWidth / 4, 50);
        ctx.fillText(player2.score.toString(), (gameWidth * 3) / 4, 50);
        
        ctx.font = '16px Courier New';
        ctx.fillText(player1.name, gameWidth / 4, 80);
        ctx.fillText(player2.name, (gameWidth * 3) / 4, 80);
        
        if (this.gameState.winner) {
            ctx.font = '48px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(`${this.gameState.winner} WINS!`, gameWidth / 2, gameHeight / 2);
            ctx.font = '24px Courier New';
            ctx.fillText('Press R to restart', gameWidth / 2, gameHeight / 2 + 60);
        } else if (!this.gameState.isRunning) {
            ctx.font = '24px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('Press SPACE to start', gameWidth / 2, gameHeight / 2 + 60);
        }
    }

    public setOnGameEnd(callback: (winner: string) => void): void {
        this.onGameEnd = callback;
    }

    public destroy(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// Application state
let currentGame: PongGame | null = null;
let tournament: Tournament | null = null;

// Rate limiter
const addPlayerRateLimiter = SecurityUtils.createRateLimiter(10, 60000);

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp(): void {
    tournament = new Tournament();
    tournament.setOnStateChange(updateTournamentDisplay);

    // Make functions globally available
    (window as any).showScreen = showScreen;
    (window as any).addPlayer = addPlayer;
    (window as any).startTournament = startTournament;
    (window as any).playNextMatch = playNextMatch;
    (window as any).startQuickGame = startQuickGame;

    console.log('Pong Tournament application initialized');
}

function showScreen(screenId: string): void {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

async function addPlayer(): Promise<void> {
    const input = document.getElementById('playerNameInput') as HTMLInputElement;
    const playerList = document.getElementById('playerList');
    
    if (!input || !playerList || !tournament) return;

    const rawName = input.value;

    if (!addPlayerRateLimiter.isAllowed('addPlayer')) {
        showErrorMessage('Too many attempts. Please wait before adding more players.');
        return;
    }

    const validation = SecurityUtils.validatePlayerName(rawName);
    if (!validation.isValid) {
        showErrorMessage(validation.error || 'Invalid player name');
        return;
    }

    await SecurityUtils.constantTimeDelay(100);

    const success = tournament.addPlayer(validation.sanitized);
    if (!success) {
        showErrorMessage('Player name already exists or is invalid');
        return;
    }

    input.value = '';
    updatePlayerList();
}

function updatePlayerList(): void {
    const playerList = document.getElementById('playerList');
    const startBtn = document.getElementById('startTournamentBtn') as HTMLButtonElement;
    
    if (!playerList || !startBtn || !tournament) return;

    const players = tournament.getState().players;
    
    playerList.innerHTML = '';
    
    if (players.length === 0) {
        playerList.innerHTML = '<p>No players added yet.</p>';
        startBtn.disabled = true;
        return;
    }

    players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin: 5px 0; padding: 5px; background: #333; border-radius: 3px;';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = player.name;
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.style.cssText = 'background: #ff4444; color: white; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer; font-size: 0.8em;';
        removeBtn.onclick = () => removePlayer(player.id);
        
        playerDiv.appendChild(nameSpan);
        playerDiv.appendChild(removeBtn);
        playerList.appendChild(playerDiv);
    });

    startBtn.disabled = players.length < 2;
}

function removePlayer(playerId: string): void {
    if (!tournament) return;
    
    tournament.removePlayer(playerId);
    updatePlayerList();
}

function startTournament(): void {
    if (!tournament) return;

    const success = tournament.startTournament();
    if (!success) {
        showErrorMessage('Cannot start tournament. Need at least 2 players.');
        return;
    }

    showScreen('tournamentBracket');
}

function updateTournamentDisplay(): void {
    if (!tournament) return;

    const state = tournament.getState();
    const bracketDisplay = document.getElementById('bracketDisplay');
    const playNextBtn = document.getElementById('playNextBtn') as HTMLButtonElement;
    
    if (!bracketDisplay || !playNextBtn) return;

    bracketDisplay.innerHTML = '';

    if (state.matches.length === 0) {
        bracketDisplay.innerHTML = '<p>No tournament in progress.</p>';
        playNextBtn.disabled = true;
        return;
    }

    const rounds = tournament.getBracketDisplay();
    
    rounds.forEach(round => {
        const roundDiv = document.createElement('div');
        roundDiv.style.cssText = 'margin: 20px 0; padding: 15px; border: 1px solid #666; border-radius: 5px;';
        
        const roundTitle = document.createElement('h3');
        roundTitle.textContent = `Round ${round.round}`;
        roundTitle.style.cssText = 'margin-bottom: 10px; text-align: center;';
        roundDiv.appendChild(roundTitle);

        round.matches.forEach(match => {
            const matchDiv = document.createElement('div');
            matchDiv.className = 'match';
            matchDiv.style.cssText = 'background: #333; border: 1px solid #fff; padding: 10px; margin: 5px 0; border-radius: 5px; text-align: center;';
            
            const player1Name = match.player1?.name || 'TBD';
            const player2Name = match.player2?.name || 'BYE';
            const winnerName = match.winner?.name || '';
            
            matchDiv.innerHTML = `
                <div style="margin-bottom: 5px;">
                    <strong>${player1Name}</strong> vs <strong>${player2Name}</strong>
                </div>
                ${match.isPlayed ? `<div style="color: #4CAF50;">Winner: ${winnerName}</div>` : '<div style="color: #FFA500;">Not played</div>'}
            `;
            
            roundDiv.appendChild(matchDiv);
        });
        
        bracketDisplay.appendChild(roundDiv);
    });

    if (state.isComplete && state.winner) {
        const winnerDiv = document.createElement('div');
        winnerDiv.style.cssText = 'margin-top: 30px; padding: 20px; background: #4CAF50; color: white; border-radius: 10px; text-align: center; font-size: 1.5em;';
        winnerDiv.innerHTML = `<h2>🏆 Tournament Winner: ${state.winner.name}! 🏆</h2>`;
        bracketDisplay.appendChild(winnerDiv);
        playNextBtn.disabled = true;
    } else {
        const nextMatch = tournament.getNextMatch();
        playNextBtn.disabled = !nextMatch;
    }
}

function playNextMatch(): void {
    if (!tournament) return;

    const nextMatch = tournament.getNextMatch();
    if (!nextMatch) {
        showErrorMessage('No matches available to play.');
        return;
    }

    if (!nextMatch.player1 || !nextMatch.player2) {
        showErrorMessage('Match players not ready.');
        return;
    }

    startGame(nextMatch.player1.name, nextMatch.player2.name, (winner) => {
        const winnerId = nextMatch.player1?.name === winner ? nextMatch.player1.id : nextMatch.player2?.id;
        if (winnerId) {
            tournament?.recordMatchResult(nextMatch.id, winnerId);
        }
        
        showScreen('tournamentBracket');
    });
}

function startQuickGame(): void {
    startGame('Player 1', 'Player 2', () => {
        showScreen('mainMenu');
    });
}

function startGame(player1Name: string, player2Name: string, onGameEnd?: (winner: string) => void): void {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const gameStatus = document.getElementById('gameStatus');
    
    if (!canvas || !gameStatus) return;

    if (currentGame) {
        currentGame.destroy();
    }

    currentGame = new PongGame(canvas, player1Name, player2Name);
    
    if (onGameEnd) {
        currentGame.setOnGameEnd(onGameEnd);
    }

    gameStatus.textContent = `${player1Name} vs ${player2Name} - Press SPACE to start`;
    
    showScreen('game');
}

function showErrorMessage(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ff4444; color: white; padding: 15px; border-radius: 5px; z-index: 1000; font-family: inherit;';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 3000);

    SecurityUtils.logSecurityEvent('error_message_displayed', { message });
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentGame) {
        currentGame.pause();
    }
});

window.addEventListener('beforeunload', () => {
    if (currentGame) {
        currentGame.destroy();
    }
});

console.log('Pong Tournament app script loaded');