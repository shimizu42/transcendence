"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class TournamentService {
    constructor(gameService) {
        this.tournaments = new Map();
        this.waitingQueue = [];
        this.gameService = gameService;
    }
    joinTournamentQueue(playerId) {
        if (this.waitingQueue.includes(playerId)) {
            return { position: this.waitingQueue.indexOf(playerId) + 1 };
        }
        this.waitingQueue.push(playerId);
        if (this.waitingQueue.length >= 4) {
            const players = this.waitingQueue.splice(0, 4);
            const tournament = this.createTournament(players);
            return { tournament };
        }
        return { position: this.waitingQueue.length };
    }
    leaveTournamentQueue(playerId) {
        this.waitingQueue = this.waitingQueue.filter(id => id !== playerId);
    }
    createTournament(playerIds) {
        const tournamentId = crypto_1.default.randomUUID();
        const tournament = {
            id: tournamentId,
            playerIds: [...playerIds],
            matches: [],
            currentRound: 1,
            status: 'semifinal',
            createdAt: new Date()
        };
        // 準決勝の試合を作成（2試合）
        const match1 = {
            id: crypto_1.default.randomUUID(),
            round: 1,
            matchNumber: 1,
            player1Id: playerIds[0],
            player2Id: playerIds[1],
            status: 'waiting',
            createdAt: new Date()
        };
        const match2 = {
            id: crypto_1.default.randomUUID(),
            round: 1,
            matchNumber: 2,
            player1Id: playerIds[2],
            player2Id: playerIds[3],
            status: 'waiting',
            createdAt: new Date()
        };
        tournament.matches = [match1, match2];
        this.tournaments.set(tournamentId, tournament);
        return tournament;
    }
    getTournament(tournamentId) {
        return this.tournaments.get(tournamentId);
    }
    startMatch(tournamentId, matchId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament)
            return null;
        const match = tournament.matches.find(m => m.id === matchId);
        if (!match || !match.player1Id || !match.player2Id)
            return null;
        const game = this.gameService.createGame([match.player1Id, match.player2Id], '2player');
        match.gameId = game.id;
        match.status = 'playing';
        this.gameService.startGame(game.id);
        return game.id;
    }
    finishMatch(tournamentId, matchId, winnerId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament)
            return false;
        const match = tournament.matches.find(m => m.id === matchId);
        if (!match)
            return false;
        match.winnerId = winnerId;
        match.status = 'finished';
        // 現在のラウンドの全試合が終了したかチェック
        const currentRoundMatches = tournament.matches.filter(m => m.round === tournament.currentRound);
        const allFinished = currentRoundMatches.every(m => m.status === 'finished');
        if (allFinished && tournament.currentRound === 1) {
            // 準決勝が終了、決勝戦を作成
            this.createFinalMatch(tournament);
        }
        else if (allFinished && tournament.currentRound === 2) {
            // 決勝戦が終了、トーナメント終了
            tournament.status = 'finished';
            tournament.winnerId = winnerId;
        }
        return true;
    }
    createFinalMatch(tournament) {
        const semifinals = tournament.matches.filter(m => m.round === 1 && m.status === 'finished');
        if (semifinals.length !== 2)
            return;
        const winner1 = semifinals[0].winnerId;
        const winner2 = semifinals[1].winnerId;
        if (!winner1 || !winner2)
            return;
        const finalMatch = {
            id: crypto_1.default.randomUUID(),
            round: 2,
            matchNumber: 1,
            player1Id: winner1,
            player2Id: winner2,
            status: 'waiting',
            createdAt: new Date()
        };
        tournament.matches.push(finalMatch);
        tournament.currentRound = 2;
        tournament.status = 'final';
    }
    getNextMatch(tournamentId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament)
            return null;
        // 現在のラウンドで待機中の試合を探す
        const waitingMatch = tournament.matches.find(m => m.round === tournament.currentRound && m.status === 'waiting');
        return waitingMatch || null;
    }
    getQueueCount() {
        return this.waitingQueue.length;
    }
    removeTournament(tournamentId) {
        this.tournaments.delete(tournamentId);
    }
}
exports.TournamentService = TournamentService;
//# sourceMappingURL=TournamentService.js.map