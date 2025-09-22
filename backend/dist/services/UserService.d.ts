import { User } from '../models/User';
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
    private hashPassword;
}
//# sourceMappingURL=UserService.d.ts.map