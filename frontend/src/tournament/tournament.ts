export interface TournamentPlayer {
    id: string;
    name: string;
    isEliminated: boolean;
}

export interface Match {
    id: string;
    player1: TournamentPlayer | null;
    player2: TournamentPlayer | null;
    winner: TournamentPlayer | null;
    round: number;
    isPlayed: boolean;
}

export interface TournamentState {
    players: TournamentPlayer[];
    matches: Match[];
    currentRound: number;
    isComplete: boolean;
    winner: TournamentPlayer | null;
}

export class Tournament {
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
        // Validate input
        if (!name || name.trim().length === 0) {
            return false;
        }

        const trimmedName = this.sanitizeInput(name.trim());
        
        // Check for duplicate names
        if (this.state.players.some(p => p.name === trimmedName)) {
            return false;
        }

        const player: TournamentPlayer = {
            id: this.generateId(),
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

        // Generate bracket
        this.generateBracket();
        this.notifyStateChange();
        return true;
    }

    private generateBracket(): void {
        const players = [...this.state.players];
        
        // Shuffle players for random bracket
        this.shuffleArray(players);
        
        // Create first round matches
        this.state.matches = [];
        let matchId = 1;
        
        for (let i = 0; i < players.length; i += 2) {
            const match: Match = {
                id: matchId.toString(),
                player1: players[i],
                player2: players[i + 1] || null, // Handle odd number of players
                winner: null,
                round: 1,
                isPlayed: false
            };
            
            // If there's no player2, player1 automatically advances
            if (!match.player2) {
                match.winner = match.player1;
                match.isPlayed = true;
            }
            
            this.state.matches.push(match);
            matchId++;
        }
        
        // Generate subsequent round matches
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
                    player1: null, // Will be filled when previous matches are played
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
        // Find the next unplayed match in the current playable round
        const playableMatches = this.state.matches.filter(match => {
            if (match.isPlayed) return false;
            
            // Check if all prerequisite matches are completed
            return this.arePrerequisiteMatchesCompleted(match);
        });

        return playableMatches.length > 0 ? playableMatches[0] : null;
    }

    private arePrerequisiteMatchesCompleted(match: Match): boolean {
        if (match.round === 1) {
            return true; // First round matches can always be played
        }

        // For subsequent rounds, check if the matches that feed into this one are complete
        const previousRoundMatches = this.state.matches.filter(m => m.round === match.round - 1);
        
        // Find the matches that should feed into this match
        const matchIndex = this.state.matches
            .filter(m => m.round === match.round)
            .findIndex(m => m.id === match.id);
            
        const feedingMatch1 = previousRoundMatches[matchIndex * 2];
        const feedingMatch2 = previousRoundMatches[matchIndex * 2 + 1];
        
        if (feedingMatch1 && !feedingMatch1.isPlayed) return false;
        if (feedingMatch2 && !feedingMatch2.isPlayed) return false;
        
        // Set the players for this match if they haven't been set
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

        // Validate winner
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

        // Mark loser as eliminated
        if (match.player1 && match.player1.id !== winnerId) {
            match.player1.isEliminated = true;
        }
        if (match.player2 && match.player2.id !== winnerId) {
            match.player2.isEliminated = true;
        }

        // Check if tournament is complete
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

    public reset(): void {
        this.state = {
            players: [],
            matches: [],
            currentRound: 1,
            isComplete: false,
            winner: null
        };
        this.notifyStateChange();
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

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }

    private shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    private sanitizeInput(input: string): string {
        // Remove potentially dangerous characters and limit length
        return input
            .replace(/[<>\"'&]/g, '') // Basic XSS prevention
            .substring(0, 20); // Limit length
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