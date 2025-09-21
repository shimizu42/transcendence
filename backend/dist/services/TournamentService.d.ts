import { Tournament, TournamentMatch } from '../models/User';
import { GameService } from './GameService';
import { TankGameService } from './TankGameService';
export declare class TournamentService {
    private tournaments;
    private pongWaitingQueue;
    private tankWaitingQueue;
    private gameService;
    private tankGameService;
    constructor(gameService: GameService, tankGameService: TankGameService);
    joinTournamentQueue(playerId: string, gameType: 'pong' | 'tank'): {
        tournament?: Tournament;
        position?: number;
    };
    leaveTournamentQueue(playerId: string): void;
    createTournament(playerIds: string[], gameType: 'pong' | 'tank'): Tournament;
    getTournament(tournamentId: string): Tournament | undefined;
    startMatch(tournamentId: string, matchId: string): string | null;
    finishMatch(tournamentId: string, matchId: string, winnerId: string): boolean;
    private createFinalMatch;
    getNextMatch(tournamentId: string): TournamentMatch | null;
    getQueueCount(gameType: 'pong' | 'tank'): number;
    removeTournament(tournamentId: string): void;
}
//# sourceMappingURL=TournamentService.d.ts.map