import { User } from '../models/User';
export declare class UserService {
    private users;
    private usersByUsername;
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
}
//# sourceMappingURL=UserService.d.ts.map