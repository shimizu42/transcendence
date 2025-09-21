import { User, FriendRequest, UserStats, MatchHistory } from '../models/User';
export declare class UserService {
    private users;
    private usersByUsername;
    private matchHistory;
    createUser(username: string, password: string): User;
    getUserByUsername(username: string): User | undefined;
    getUserById(id: string): User | undefined;
    authenticateUser(username: string, password: string): User | null;
    setUserOnline(userId: string, socketId: string): void;
    setUserOffline(userId: string): void;
    setUserInGame(userId: string, inGame: boolean): void;
    getOnlineUsers(): User[];
    getAllUsers(): User[];
    private hashPassword;
    private createDefaultGameTypeStats;
    updateUserProfile(userId: string, updates: {
        displayName?: string;
        bio?: string;
        email?: string;
    }): User | null;
    updateUserAvatar(userId: string, avatarPath: string): User | null;
    getDefaultAvatars(): string[];
    sendFriendRequest(fromUserId: string, toUserId: string): FriendRequest | null;
    respondToFriendRequest(userId: string, requestId: string, response: 'accepted' | 'declined'): boolean;
    removeFriend(userId: string, friendId: string): boolean;
    getFriends(userId: string): User[];
    getFriendRequests(userId: string): FriendRequest[];
    recordMatchResult(result: {
        gameId: string;
        gameType: 'pong' | 'tank';
        gameMode: '2player' | '4player' | 'tournament';
        players: Array<{
            playerId: string;
            score: number;
            result: 'win' | 'loss';
        }>;
        duration: number;
        isRanked?: boolean;
        tournamentId?: string;
    }): void;
    getMatchHistory(userId: string, limit?: number, offset?: number): MatchHistory[];
    getUserStats(userId: string): UserStats | null;
    getLeaderboard(gameType?: 'pong' | 'tank', limit?: number): Array<{
        user: User;
        stats: UserStats;
        rank: number;
    }>;
    searchUsers(query: string, excludeUserId?: string): User[];
}
//# sourceMappingURL=UserService.d.ts.map