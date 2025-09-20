import { Tournament, TournamentMatch } from '../models/User';
import { GameService } from './GameService';
export declare class TournamentService {
    private tournaments;
    private waitingQueue;
    private gameService;
    constructor(gameService: GameService);
    joinTournamentQueue(playerId: string): {
        tournament?: Tournament;
        position?: number;
    };
    leaveTournamentQueue(playerId: string): void;
    createTournament(playerIds: string[]): Tournament;
    getTournament(tournamentId: string): Tournament | undefined;
    startMatch(tournamentId: string, matchId: string): string | null;
    finishMatch(tournamentId: string, matchId: string, winnerId: string): boolean;
    private createFinalMatch;
    getNextMatch(tournamentId: string): TournamentMatch | null;
    getQueueCount(): number;
    removeTournament(tournamentId: string): void;
}
//# sourceMappingURL=TournamentService.d.ts.map