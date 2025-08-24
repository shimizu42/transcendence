"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = void 0;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.createUser = createUser;
exports.authenticateUser = authenticateUser;
exports.getUserById = getUserById;
exports.updateUserOnlineStatus = updateUserOnlineStatus;
exports.updateUserProfile = updateUserProfile;
exports.addFriend = addFriend;
exports.removeFriend = removeFriend;
exports.getFriends = getFriends;
exports.searchUsers = searchUsers;
exports.addMatchToHistory = addMatchToHistory;
exports.getMatchHistory = getMatchHistory;
exports.getUserStats = getUserStats;
exports.getDefaultAvatars = getDefaultAvatars;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;
// In-memory storage
exports.users = new Map();
const usersByUsername = new Map(); // username -> userId
const friendships = new Map(); // userId -> Set of friend userIds
const matchHistory = new Map(); // userId -> Match[]
// Default avatars
const DEFAULT_AVATARS = [
    '/avatars/default1.svg',
    '/avatars/default2.svg',
    '/avatars/default3.svg',
    '/avatars/default4.svg',
    '/avatars/default5.svg'
];
async function hashPassword(password) {
    return bcrypt_1.default.hash(password, SALT_ROUNDS);
}
async function verifyPassword(password, hash) {
    return bcrypt_1.default.compare(password, hash);
}
function generateToken(userId) {
    return jsonwebtoken_1.default.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
}
async function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return decoded.userId;
    }
    catch (error) {
        return null;
    }
}
async function createUser(data) {
    // Check if username already exists
    if (usersByUsername.has(data.username)) {
        throw new Error('Username already taken');
    }
    // Check if display name is unique
    const displayNameExists = Array.from(exports.users.values()).some(user => user.displayName === data.displayName);
    if (displayNameExists) {
        throw new Error('Display name already taken');
    }
    const hashedPassword = await hashPassword(data.password);
    const userId = (0, uuid_1.v4)();
    const user = {
        id: userId,
        username: data.username,
        displayName: data.displayName,
        password: hashedPassword,
        avatar: data.avatar || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
        isOnline: true,
        lastSeen: new Date(),
        wins: 0,
        losses: 0,
        totalGames: 0,
        friends: [],
        createdAt: new Date()
    };
    exports.users.set(userId, user);
    usersByUsername.set(data.username, userId);
    friendships.set(userId, new Set());
    matchHistory.set(userId, []);
    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        wins: user.wins,
        losses: user.losses,
        totalGames: user.totalGames
    };
}
async function authenticateUser(username, password) {
    const userId = usersByUsername.get(username);
    if (!userId) {
        return null;
    }
    const user = exports.users.get(userId);
    if (!user || !await verifyPassword(password, user.password)) {
        return null;
    }
    // Update last seen and online status
    user.lastSeen = new Date();
    user.isOnline = true;
    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        wins: user.wins,
        losses: user.losses,
        totalGames: user.totalGames
    };
}
async function getUserById(userId) {
    const user = exports.users.get(userId);
    if (!user)
        return null;
    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        wins: user.wins,
        losses: user.losses,
        totalGames: user.totalGames
    };
}
async function updateUserOnlineStatus(userId, isOnline) {
    const user = exports.users.get(userId);
    if (user) {
        user.isOnline = isOnline;
        user.lastSeen = new Date();
    }
}
async function updateUserProfile(userId, data) {
    const user = exports.users.get(userId);
    if (!user) {
        throw new Error('User not found');
    }
    // Check if display name is unique (if changing)
    if (data.displayName && data.displayName !== user.displayName) {
        const displayNameExists = Array.from(exports.users.values()).some(u => u.id !== userId && u.displayName === data.displayName);
        if (displayNameExists) {
            throw new Error('Display name already taken');
        }
        user.displayName = data.displayName;
    }
    if (data.avatar !== undefined) {
        user.avatar = data.avatar;
    }
    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        wins: user.wins,
        losses: user.losses,
        totalGames: user.totalGames
    };
}
// Friend system functions
async function addFriend(userId, friendId) {
    console.log(`Adding friend: userId=${userId}, friendId=${friendId}`);
    const user = exports.users.get(userId);
    const friend = exports.users.get(friendId);
    console.log(`User exists: ${!!user}, Friend exists: ${!!friend}`);
    console.log(`All users: ${Array.from(exports.users.keys()).join(', ')}`);
    if (!user || !friend) {
        throw new Error('User not found');
    }
    if (userId === friendId) {
        throw new Error('Cannot add yourself as friend');
    }
    const userFriends = friendships.get(userId) || new Set();
    const friendFriends = friendships.get(friendId) || new Set();
    userFriends.add(friendId);
    friendFriends.add(userId);
    friendships.set(userId, userFriends);
    friendships.set(friendId, friendFriends);
    // Update user objects
    user.friends = Array.from(userFriends);
    friend.friends = Array.from(friendFriends);
}
async function removeFriend(userId, friendId) {
    const user = exports.users.get(userId);
    const friend = exports.users.get(friendId);
    if (!user || !friend) {
        throw new Error('User not found');
    }
    const userFriends = friendships.get(userId) || new Set();
    const friendFriends = friendships.get(friendId) || new Set();
    userFriends.delete(friendId);
    friendFriends.delete(userId);
    friendships.set(userId, userFriends);
    friendships.set(friendId, friendFriends);
    // Update user objects
    user.friends = Array.from(userFriends);
    friend.friends = Array.from(friendFriends);
}
async function getFriends(userId) {
    const userFriends = friendships.get(userId) || new Set();
    const friends = [];
    for (const friendId of userFriends) {
        const friend = await getUserById(friendId);
        if (friend) {
            friends.push(friend);
        }
    }
    return friends;
}
async function searchUsers(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    for (const user of exports.users.values()) {
        if (user.username.toLowerCase().includes(lowerQuery) ||
            user.displayName.toLowerCase().includes(lowerQuery)) {
            results.push({
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatar,
                isOnline: user.isOnline,
                lastSeen: user.lastSeen,
                wins: user.wins,
                losses: user.losses,
                totalGames: user.totalGames
            });
        }
    }
    return results;
}
// Match history functions
async function addMatchToHistory(match) {
    const matchWithId = {
        id: (0, uuid_1.v4)(),
        ...match
    };
    // Add to both players' history
    const player1History = matchHistory.get(match.player1Id) || [];
    const player2History = matchHistory.get(match.player2Id) || [];
    player1History.push(matchWithId);
    player2History.push(matchWithId);
    matchHistory.set(match.player1Id, player1History);
    matchHistory.set(match.player2Id, player2History);
    // Update user stats
    const player1 = exports.users.get(match.player1Id);
    const player2 = exports.users.get(match.player2Id);
    if (player1 && player2) {
        player1.totalGames++;
        player2.totalGames++;
        if (match.winnerId === match.player1Id) {
            player1.wins++;
            player2.losses++;
        }
        else if (match.winnerId === match.player2Id) {
            player2.wins++;
            player1.losses++;
        }
    }
}
async function getMatchHistory(userId) {
    return matchHistory.get(userId) || [];
}
async function getUserStats(userId) {
    const user = exports.users.get(userId);
    if (!user) {
        throw new Error('User not found');
    }
    const winRate = user.totalGames > 0 ? (user.wins / user.totalGames) * 100 : 0;
    return {
        wins: user.wins,
        losses: user.losses,
        totalGames: user.totalGames,
        winRate: Math.round(winRate * 100) / 100 // Round to 2 decimal places
    };
}
function getDefaultAvatars() {
    return [...DEFAULT_AVATARS];
}
