import { Tournament, TournamentMatch } from '../models/User';
import { GameService } from './GameService';
import { TankGameService } from './TankGameService';
import crypto from 'crypto';

export class TournamentService {
  private tournaments: Map<string, Tournament> = new Map();
  private pongWaitingQueue: string[] = [];
  private tankWaitingQueue: string[] = [];
  private gameService: GameService;
  private tankGameService: TankGameService;

  constructor(gameService: GameService, tankGameService: TankGameService) {
    this.gameService = gameService;
    this.tankGameService = tankGameService;
  }

  joinTournamentQueue(playerId: string, gameType: 'pong' | 'tank'): { tournament?: Tournament; position?: number } {
    const queue = gameType === 'pong' ? this.pongWaitingQueue : this.tankWaitingQueue;

    if (queue.includes(playerId)) {
      return { position: queue.indexOf(playerId) + 1 };
    }

    queue.push(playerId);

    if (queue.length >= 4) {
      const players = queue.splice(0, 4);
      const tournament = this.createTournament(players, gameType);
      return { tournament };
    }

    return { position: queue.length };
  }

  leaveTournamentQueue(playerId: string): void {
    this.pongWaitingQueue = this.pongWaitingQueue.filter(id => id !== playerId);
    this.tankWaitingQueue = this.tankWaitingQueue.filter(id => id !== playerId);
  }

  createTournament(playerIds: string[], gameType: 'pong' | 'tank'): Tournament {
    const tournamentId = crypto.randomUUID();

    const tournament: Tournament = {
      id: tournamentId,
      gameType,
      playerIds: [...playerIds],
      matches: [],
      currentRound: 1,
      status: 'semifinal',
      createdAt: new Date()
    };

    // 準決勝の試合を作成（2試合）
    const match1: TournamentMatch = {
      id: crypto.randomUUID(),
      round: 1,
      matchNumber: 1,
      player1Id: playerIds[0],
      player2Id: playerIds[1],
      status: 'waiting',
      createdAt: new Date()
    };

    const match2: TournamentMatch = {
      id: crypto.randomUUID(),
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

  getTournament(tournamentId: string): Tournament | undefined {
    return this.tournaments.get(tournamentId);
  }

  startMatch(tournamentId: string, matchId: string): string | null {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;

    const match = tournament.matches.find(m => m.id === matchId);
    if (!match || !match.player1Id || !match.player2Id) return null;

    let game;
    if (tournament.gameType === 'tank') {
      // Use shared TankGameService instance
      game = this.tankGameService.createGame([match.player1Id, match.player2Id], '2player');
    } else {
      // Pongゲーム
      game = this.gameService.createGame([match.player1Id, match.player2Id], '2player');
    }

    match.gameId = game.id;
    match.status = 'playing';

    if (tournament.gameType === 'tank') {
      this.tankGameService.startGame(game.id);
    } else {
      this.gameService.startGame(game.id);
    }

    return game.id;
  }

  finishMatch(tournamentId: string, matchId: string, winnerId: string): boolean {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return false;

    const match = tournament.matches.find(m => m.id === matchId);
    if (!match) return false;

    match.winnerId = winnerId;
    match.status = 'finished';

    // 現在のラウンドの全試合が終了したかチェック
    const currentRoundMatches = tournament.matches.filter(m => m.round === tournament.currentRound);
    const allFinished = currentRoundMatches.every(m => m.status === 'finished');

    if (allFinished && tournament.currentRound === 1) {
      // 準決勝が終了、決勝戦を作成
      this.createFinalMatch(tournament);
    } else if (allFinished && tournament.currentRound === 2) {
      // 決勝戦が終了、トーナメント終了
      tournament.status = 'finished';
      tournament.winnerId = winnerId;
    }

    return true;
  }

  private createFinalMatch(tournament: Tournament): void {
    const semifinals = tournament.matches.filter(m => m.round === 1 && m.status === 'finished');
    if (semifinals.length !== 2) return;

    const winner1 = semifinals[0].winnerId;
    const winner2 = semifinals[1].winnerId;

    if (!winner1 || !winner2) return;

    const finalMatch: TournamentMatch = {
      id: crypto.randomUUID(),
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

  getNextMatch(tournamentId: string): TournamentMatch | null {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;

    // 現在のラウンドで待機中の試合を探す
    const waitingMatch = tournament.matches.find(
      m => m.round === tournament.currentRound && m.status === 'waiting'
    );

    return waitingMatch || null;
  }

  getQueueCount(gameType: 'pong' | 'tank'): number {
    const queue = gameType === 'pong' ? this.pongWaitingQueue : this.tankWaitingQueue;
    return queue.length;
  }

  removeTournament(tournamentId: string): void {
    this.tournaments.delete(tournamentId);
  }
}