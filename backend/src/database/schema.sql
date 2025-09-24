-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    display_name TEXT,
    bio TEXT,
    avatar TEXT,
    is_online BOOLEAN DEFAULT 0,
    is_in_game BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
);

-- Friend requests table
CREATE TABLE IF NOT EXISTS friend_requests (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(from_user_id, to_user_id)
);

-- Friends table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS friendships (
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User statistics table
CREATE TABLE IF NOT EXISTS user_stats (
    user_id TEXT PRIMARY KEY,
    total_games INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    win_rate REAL DEFAULT 0.0,
    tournament_wins INTEGER DEFAULT 0,
    longest_win_streak INTEGER DEFAULT 0,
    current_win_streak INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Game type statistics table
CREATE TABLE IF NOT EXISTS game_type_stats (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    game_type TEXT CHECK(game_type IN ('pong', 'tank')) NOT NULL,
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    win_rate REAL DEFAULT 0.0,
    average_game_duration INTEGER DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, game_type)
);

-- Match history table
CREATE TABLE IF NOT EXISTS match_history (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    game_type TEXT CHECK(game_type IN ('pong', 'tank')) NOT NULL,
    game_mode TEXT CHECK(game_mode IN ('2player', '4player', 'tournament')) NOT NULL,
    player_id TEXT NOT NULL,
    opponent_ids TEXT NOT NULL, -- JSON array of opponent IDs
    opponent_names TEXT NOT NULL, -- JSON array of opponent names
    result TEXT CHECK(result IN ('win', 'loss')) NOT NULL,
    score INTEGER NOT NULL,
    opponent_scores TEXT NOT NULL, -- JSON array of opponent scores
    duration INTEGER NOT NULL, -- Duration in seconds
    date_played DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_ranked BOOLEAN DEFAULT 1,
    tournament_id TEXT,
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Games table (for active/completed games)
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    game_type TEXT CHECK(game_type IN ('pong', 'tank')) NOT NULL,
    game_mode TEXT CHECK(game_mode IN ('2player', '4player', 'tournament')) NOT NULL,
    player_ids TEXT NOT NULL, -- JSON array of player IDs
    status TEXT CHECK(status IN ('waiting', 'active', 'completed')) DEFAULT 'waiting',
    winner_id TEXT,
    scores TEXT, -- JSON object with player scores
    start_time DATETIME,
    end_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    tournament_id TEXT
);

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    game_type TEXT CHECK(game_type IN ('pong', 'tank')) NOT NULL,
    status TEXT CHECK(status IN ('waiting', 'active', 'completed')) DEFAULT 'waiting',
    player_ids TEXT NOT NULL, -- JSON array of player IDs
    bracket TEXT, -- JSON representation of tournament bracket
    winner_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    start_time DATETIME,
    end_time DATETIME
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user ON friend_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_from_user ON friend_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_match_history_player ON match_history(player_id);
CREATE INDEX IF NOT EXISTS idx_match_history_date ON match_history(date_played);
CREATE INDEX IF NOT EXISTS idx_match_history_game_type ON match_history(game_type);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);