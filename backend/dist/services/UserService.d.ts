import { User, FriendRequest } from '../models/User';
export declare class UserService {
    private db;
    private saltRounds;
    constructor();
    createUser(username: string, password: string): Promise<User>;
    getUserByUsername(username: string): User | undefined;
    getUserById(id: string): User | undefined;
    getAllUsers(): User[];
    getOnlineUsers(): User[];
    setUserOnline(userId: string, isOnline: boolean): void;
    setUserInGame(userId: string, isInGame: boolean): void;
    setUserOffline(userId: string): void;
    validatePassword(username: string, password: string): Promise<boolean>;
    authenticateUser(username: string, password: string): User | null;
    private convertDbUserToUser;
    updateUserStats(userId: string, gameType: 'pong' | 'tank', won: boolean, gameDuration?: number, score?: number): void;
    recordMatchResult(playerIds: string[], winnerId: string, gameType: 'pong' | 'tank', gameDuration?: number): void;
    createFriendRequest(fromUserId: string, toUserId: string): FriendRequest;
    getFriendRequests(userId: string): FriendRequest[];
    respondToFriendRequest(requestId: string, userId: string, response: 'accepted' | 'declined'): void;
    getFriends(userId: string): User[];
    updateUserProfile(userId: string, updates: {
        displayName?: string;
        bio?: string;
    }): boolean;
    updateUserAvatar(userId: string, avatarUrl: string): boolean;
    private hashPassword;
}
//# sourceMappingURL=UserService.d.ts.map