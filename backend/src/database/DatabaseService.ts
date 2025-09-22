// Simplified in-memory database for Docker compatibility
export class DatabaseService {
  private tables: Map<string, any[]> = new Map();
  private static instance: DatabaseService;

  private constructor() {
    this.initializeTables();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initializeTables(): void {
    this.tables.set('users', []);
    this.tables.set('user_stats', []);
    this.tables.set('game_type_stats', []);
    this.tables.set('friend_requests', []);
    this.tables.set('friendships', []);
    this.tables.set('match_history', []);
    console.log('In-memory database tables initialized');
  }

  public async initialize(): Promise<void> {
    console.log('Database initialized successfully (in-memory)');
  }

  public run(sql: string, params: any[] = []): any {
    // Simplified implementation for basic CRUD operations
    if (sql.includes('INSERT INTO users')) {
      const users = this.tables.get('users')!;
      const user = {
        id: params[0],
        username: params[1],
        password_hash: params[2],
        is_online: params[3],
        is_in_game: params[4],
        created_at: new Date().toISOString(),
        email: null,
        display_name: null,
        bio: null,
        avatar: null,
        last_login_at: null
      };
      users.push(user);
      return { lastInsertRowid: users.length, changes: 1 };
    }

    if (sql.includes('INSERT INTO user_stats')) {
      const stats = this.tables.get('user_stats')!;
      const stat = {
        user_id: params[0],
        total_games: params[1],
        wins: params[2],
        losses: params[3],
        win_rate: params[4],
        tournament_wins: params[5],
        longest_win_streak: params[6],
        current_win_streak: params[7]
      };
      stats.push(stat);
      return { lastInsertRowid: stats.length, changes: 1 };
    }

    if (sql.includes('INSERT INTO game_type_stats')) {
      const gameStats = this.tables.get('game_type_stats')!;
      const stat = {
        id: params[0],
        user_id: params[1],
        game_type: params[2],
        games_played: params[3],
        wins: params[4],
        losses: params[5],
        win_rate: params[6],
        average_game_duration: params[7],
        best_score: params[8]
      };
      gameStats.push(stat);
      return { lastInsertRowid: gameStats.length, changes: 1 };
    }

    if (sql.includes('UPDATE users SET is_online')) {
      const users = this.tables.get('users')!;
      const userId = params[params.length - 1];
      const user = users.find(u => u.id === userId);
      if (user) {
        user.is_online = params[0];
        if (params.length > 2) {
          user.last_login_at = params[1];
        }
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (sql.includes('UPDATE users SET is_in_game')) {
      const users = this.tables.get('users')!;
      const userId = params[1];
      const user = users.find(u => u.id === userId);
      if (user) {
        user.is_in_game = params[0];
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (sql.includes('UPDATE user_stats SET')) {
      const stats = this.tables.get('user_stats')!;
      const userId = params[6]; // user_id is the last parameter
      const stat = stats.find(s => s.user_id === userId);
      if (stat) {
        stat.total_games = params[0];
        stat.wins = params[1];
        stat.losses = params[2];
        stat.win_rate = params[3];
        stat.longest_win_streak = params[4];
        stat.current_win_streak = params[5];
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (sql.includes('UPDATE game_type_stats SET')) {
      const gameStats = this.tables.get('game_type_stats')!;
      const userId = params[6]; // user_id is the 7th parameter
      const gameType = params[7]; // game_type is the 8th parameter
      const stat = gameStats.find(s => s.user_id === userId && s.game_type === gameType);
      if (stat) {
        stat.games_played = params[0];
        stat.wins = params[1];
        stat.losses = params[2];
        stat.win_rate = params[3];
        stat.average_game_duration = params[4];
        stat.best_score = params[5];
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    return { lastInsertRowid: 0, changes: 0 };
  }

  public get<T = any>(sql: string, params: any[] = []): T | undefined {
    if (sql.includes('SELECT * FROM users WHERE username = ?')) {
      const users = this.tables.get('users')!;
      return users.find(u => u.username === params[0]) as T;
    }

    if (sql.includes('SELECT * FROM users WHERE id = ?')) {
      const users = this.tables.get('users')!;
      return users.find(u => u.id === params[0]) as T;
    }

    if (sql.includes('SELECT password_hash FROM users WHERE username = ?')) {
      const users = this.tables.get('users')!;
      const user = users.find(u => u.username === params[0]);
      return user ? { password_hash: user.password_hash } as T : undefined;
    }

    if (sql.includes('SELECT * FROM user_stats WHERE user_id = ?')) {
      const stats = this.tables.get('user_stats')!;
      return stats.find(s => s.user_id === params[0]) as T;
    }

    if (sql.includes('SELECT * FROM game_type_stats WHERE user_id = ? AND game_type = ?')) {
      const gameStats = this.tables.get('game_type_stats')!;
      return gameStats.find(s => s.user_id === params[0] && s.game_type === params[1]) as T;
    }

    return undefined;
  }

  public all<T = any>(sql: string, params: any[] = []): T[] {
    if (sql.includes('SELECT * FROM users WHERE is_online = 1')) {
      const users = this.tables.get('users')!;
      return users.filter(u => u.is_online === 1) as T[];
    }

    if (sql.includes('SELECT * FROM users')) {
      const users = this.tables.get('users')!;
      return users as T[];
    }

    return [];
  }

  public transaction<T>(callback: () => T): T {
    try {
      return callback();
    } catch (error) {
      throw error;
    }
  }

  public close(): void {
    console.log('Database connection closed (in-memory)');
  }

  // Helper methods for common database operations
  public exists(table: string, where: string, params: any[] = []): boolean {
    return false; // Simplified
  }

  public count(table: string, where?: string, params: any[] = []): number {
    const tableData = this.tables.get(table);
    return tableData ? tableData.length : 0;
  }

  public insert(table: string, data: Record<string, any>): string {
    const tableData = this.tables.get(table);
    if (tableData) {
      tableData.push(data);
      return tableData.length.toString();
    }
    return '0';
  }

  public update(table: string, data: Record<string, any>, where: string, whereParams: any[] = []): number {
    return 0; // Simplified
  }

  public delete(table: string, where: string, params: any[] = []): number {
    return 0; // Simplified
  }
}