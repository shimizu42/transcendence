import { PongGame } from './game/pong';
import { Tournament, TournamentPlayer, Match } from './tournament/tournament';
import { SecurityUtils } from './utils/security';
import { ScreenManager, HistoryManager } from './utils/spa';

// Global state
let currentGame: PongGame | null = null;
let tournament: Tournament | null = null;
let screenManager: ScreenManager;
let historyManager: HistoryManager;

// Rate limiter for player additions to prevent spam
const addPlayerRateLimiter = SecurityUtils.createRateLimiter(10, 60000); // 10 attempts per minute

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp(): void {
    // Enforce Content Security Policy
    SecurityUtils.enforceCSP();

    // Initialize managers
    screenManager = new ScreenManager();
    historyManager = HistoryManager.getInstance();
    
    // Initialize tournament
    tournament = new Tournament();
    tournament.setOnStateChange(updateTournamentDisplay);

    // Setup global functions
    setupGlobalFunctions();

    // Initialize SPA routing
    screenManager.init();

    console.log('Pong Tournament application initialized');
}

function setupGlobalFunctions(): void {
    // Make functions available globally for HTML onclick handlers
    (window as any).showScreen = (screenId: string) => {
        screenManager.showScreen(screenId);
        historyManager.addEntry(screenId);
    };

    (window as any).addPlayer = addPlayer;
    (window as any).startTournament = startTournament;
    (window as any).playNextMatch = playNextMatch;
    (window as any).startQuickGame = startQuickGame;
}

async function addPlayer(): Promise<void> {
    const input = document.getElementById('playerNameInput') as HTMLInputElement;
    const playerList = document.getElementById('playerList');
    
    if (!input || !playerList || !tournament) return;

    const rawName = input.value;

    // Rate limiting
    if (!addPlayerRateLimiter.isAllowed('addPlayer')) {
        showErrorMessage('Too many attempts. Please wait before adding more players.');
        return;
    }

    // Validate and sanitize input
    const validation = SecurityUtils.validatePlayerName(rawName);
    if (!validation.isValid) {
        showErrorMessage(validation.error || 'Invalid player name');
        return;
    }

    // Add delay to prevent timing attacks
    await SecurityUtils.constantTimeDelay(100);

    // Add player to tournament
    const success = tournament.addPlayer(validation.sanitized);
    if (!success) {
        showErrorMessage('Player name already exists or is invalid');
        return;
    }

    // Clear input
    input.value = '';
    
    // Update display
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

    // Enable start button if we have at least 2 players
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

    screenManager.showScreen('tournamentBracket');
    historyManager.addEntry('tournamentBracket');
}

function updateTournamentDisplay(): void {
    if (!tournament) return;

    const state = tournament.getState();
    const bracketDisplay = document.getElementById('bracketDisplay');
    const playNextBtn = document.getElementById('playNextBtn') as HTMLButtonElement;
    
    if (!bracketDisplay || !playNextBtn) return;

    // Clear previous display
    bracketDisplay.innerHTML = '';

    if (state.matches.length === 0) {
        bracketDisplay.innerHTML = '<p>No tournament in progress.</p>';
        playNextBtn.disabled = true;
        return;
    }

    // Display tournament bracket
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

    // Check if tournament is complete
    if (state.isComplete && state.winner) {
        const winnerDiv = document.createElement('div');
        winnerDiv.style.cssText = 'margin-top: 30px; padding: 20px; background: #4CAF50; color: white; border-radius: 10px; text-align: center; font-size: 1.5em;';
        winnerDiv.innerHTML = `<h2>🏆 Tournament Winner: ${state.winner.name}! 🏆</h2>`;
        bracketDisplay.appendChild(winnerDiv);
        playNextBtn.disabled = true;
    } else {
        // Enable/disable play next button
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

    // Start the game
    startGame(nextMatch.player1.name, nextMatch.player2.name, (winner) => {
        // Record the match result
        const winnerId = nextMatch.player1?.name === winner ? nextMatch.player1.id : nextMatch.player2?.id;
        if (winnerId) {
            tournament?.recordMatchResult(nextMatch.id, winnerId);
        }
        
        // Return to bracket view
        screenManager.showScreen('tournamentBracket');
    });
}

function startQuickGame(): void {
    startGame('Player 1', 'Player 2', () => {
        screenManager.showScreen('mainMenu');
    });
}

function startGame(player1Name: string, player2Name: string, onGameEnd?: (winner: string) => void): void {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const gameStatus = document.getElementById('gameStatus');
    
    if (!canvas || !gameStatus) return;

    // Clean up previous game
    if (currentGame) {
        currentGame.destroy();
    }

    // Create new game
    currentGame = new PongGame(canvas, player1Name, player2Name);
    
    if (onGameEnd) {
        currentGame.setOnGameEnd(onGameEnd);
    }

    // Update game status
    gameStatus.textContent = `${player1Name} vs ${player2Name} - Press SPACE to start`;
    
    screenManager.showScreen('game');
    historyManager.addEntry('game', { player1Name, player2Name });
}

function showErrorMessage(message: string): void {
    // Create a temporary error display
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ff4444; color: white; padding: 15px; border-radius: 5px; z-index: 1000; font-family: inherit;';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 3000);

    // Log security event
    SecurityUtils.logSecurityEvent('error_message_displayed', { message });
}

// Handle page visibility changes to pause games
document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentGame) {
        currentGame.pause();
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    // Could implement canvas resizing here if needed
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (currentGame) {
        currentGame.destroy();
    }
});

console.log('Pong Tournament main script loaded');