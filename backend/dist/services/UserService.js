"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class UserService {
    constructor() {
        this.users = new Map();
        this.usersByUsername = new Map();
    }
    createUser(username, password) {
        if (this.usersByUsername.has(username)) {
            throw new Error('Username already exists');
        }
        const hashedPassword = this.hashPassword(password);
        const user = {
            id: crypto_1.default.randomUUID(),
            username,
            password: hashedPassword,
            isOnline: false,
            isInGame: false
        };
        this.users.set(user.id, user);
        this.usersByUsername.set(username, user);
        return user;
    }
    getUserByUsername(username) {
        return this.usersByUsername.get(username);
    }
    getUserById(id) {
        return this.users.get(id);
    }
    authenticateUser(username, password) {
        const user = this.getUserByUsername(username);
        if (!user)
            return null;
        const hashedPassword = this.hashPassword(password);
        if (user.password !== hashedPassword)
            return null;
        return user;
    }
    setUserOnline(userId, socketId) {
        const user = this.users.get(userId);
        if (user) {
            user.isOnline = true;
            user.socketId = socketId;
        }
    }
    setUserOffline(userId) {
        const user = this.users.get(userId);
        if (user) {
            user.isOnline = false;
            user.isInGame = false;
            delete user.socketId;
        }
    }
    setUserInGame(userId, inGame) {
        const user = this.users.get(userId);
        if (user) {
            user.isInGame = inGame;
        }
    }
    getOnlineUsers() {
        return Array.from(this.users.values()).filter(user => user.isOnline);
    }
    getAllUsers() {
        return Array.from(this.users.values());
    }
    hashPassword(password) {
        return crypto_1.default.createHash('sha256').update(password).digest('hex');
    }
}
exports.UserService = UserService;
//# sourceMappingURL=UserService.js.map