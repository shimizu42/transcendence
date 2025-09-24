"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = userRoutes;
const auth_1 = require("../middleware/auth");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
async function userRoutes(fastify) {
    const userService = fastify.userService;
    // Get online users for the game lobby
    fastify.get('/users', { preHandler: auth_1.authenticate }, async (request, reply) => {
        try {
            const users = userService.getOnlineUsers().map((user) => {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            });
            reply.send(users);
        }
        catch (error) {
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
    // Get current user profile
    fastify.get('/users/profile', { preHandler: auth_1.authenticate }, async (request, reply) => {
        try {
            const userId = request.user.id;
            const user = userService.getUserById(userId);
            if (!user) {
                return reply.code(404).send({ error: 'User not found' });
            }
            const { password, ...userWithoutPassword } = user;
            reply.send(userWithoutPassword);
        }
        catch (error) {
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
    // Profile update endpoint
    fastify.put('/users/profile', { preHandler: auth_1.authenticate }, async (request, reply) => {
        try {
            const userId = request.user.id;
            const { displayName, bio } = request.body;
            const updateResult = userService.updateUserProfile(userId, { displayName, bio });
            if (updateResult) {
                const updatedUser = userService.getUserById(userId);
                if (updatedUser) {
                    const { password, ...userWithoutPassword } = updatedUser;
                    reply.send(userWithoutPassword);
                }
            }
            else {
                reply.code(500).send({ error: 'Failed to update profile' });
            }
        }
        catch (error) {
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
    // Avatar upload endpoint
    fastify.post('/users/avatar', { preHandler: auth_1.authenticate }, async (request, reply) => {
        try {
            const userId = request.user.id;
            console.log('Avatar upload request from user:', userId);
            const data = await request.file();
            console.log('File data:', data ? 'File received' : 'No file');
            if (!data) {
                return reply.code(400).send({ error: 'No file uploaded' });
            }
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedTypes.includes(data.mimetype)) {
                return reply.code(400).send({ error: 'Invalid file type. Only JPG and PNG files are allowed.' });
            }
            // Validate file size (5MB limit)
            const maxSize = 5 * 1024 * 1024; // 5MB
            const buffer = await data.toBuffer();
            if (buffer.length > maxSize) {
                return reply.code(400).send({ error: 'File too large. Maximum size is 5MB.' });
            }
            // Generate unique filename
            const fileExtension = data.mimetype === 'image/jpeg' ? 'jpg' : 'png';
            const filename = `${userId}-${crypto_1.default.randomUUID()}.${fileExtension}`;
            const uploadPath = path_1.default.join(process.cwd(), 'uploads', 'avatars', filename);
            // Ensure uploads directory exists
            const uploadsDir = path_1.default.dirname(uploadPath);
            if (!fs_1.default.existsSync(uploadsDir)) {
                fs_1.default.mkdirSync(uploadsDir, { recursive: true });
            }
            // Delete old avatar if exists
            const currentUser = userService.getUserById(userId);
            if (currentUser?.avatar && !currentUser.avatar.includes('default.svg')) {
                const oldAvatarPath = path_1.default.join(process.cwd(), 'uploads', 'avatars', path_1.default.basename(currentUser.avatar));
                if (fs_1.default.existsSync(oldAvatarPath)) {
                    fs_1.default.unlinkSync(oldAvatarPath);
                }
            }
            // Save file
            fs_1.default.writeFileSync(uploadPath, buffer);
            // Update user avatar in database
            const avatarUrl = `/api/avatars/avatars/${filename}`;
            const updateResult = userService.updateUserAvatar(userId, avatarUrl);
            if (updateResult) {
                console.log('Avatar uploaded successfully:', avatarUrl);
                reply.send({ avatarUrl });
            }
            else {
                console.error('Failed to update avatar in database');
                // Clean up uploaded file if database update failed
                if (fs_1.default.existsSync(uploadPath)) {
                    fs_1.default.unlinkSync(uploadPath);
                }
                reply.code(500).send({ error: 'Failed to update avatar' });
            }
        }
        catch (error) {
            console.error('Avatar upload error:', error);
            reply.code(500).send({ error: `Internal server error: ${error.message || 'Unknown error'}` });
        }
    });
    // Get user by ID
    fastify.get('/users/:id', { preHandler: auth_1.authenticate }, async (request, reply) => {
        try {
            const { id } = request.params;
            const user = userService.getUserById(id);
            if (!user) {
                return reply.code(404).send({ error: 'User not found' });
            }
            const { password, ...userWithoutPassword } = user;
            reply.send(userWithoutPassword);
        }
        catch (error) {
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
    // Basic stats endpoint
    fastify.get('/users/:id/stats', { preHandler: auth_1.authenticate }, async (request, reply) => {
        try {
            const { id } = request.params;
            const user = userService.getUserById(id);
            if (!user) {
                return reply.code(404).send({ error: 'User not found' });
            }
            reply.send(user.stats);
        }
        catch (error) {
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
    // Placeholder endpoints for frontend compatibility
    fastify.get('/users/friends', { preHandler: auth_1.authenticate }, async (request, reply) => {
        try {
            const userId = request.user.id;
            const friends = userService.getFriends(userId);
            reply.send(friends);
        }
        catch (error) {
            console.error('Get friends error:', error);
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
    fastify.get('/users/friend-requests', { preHandler: auth_1.authenticate }, async (request, reply) => {
        try {
            const userId = request.user.id;
            const friendRequests = userService.getFriendRequests(userId);
            reply.send(friendRequests);
        }
        catch (error) {
            console.error('Get friend requests error:', error);
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
    fastify.post('/users/friend-request', { preHandler: auth_1.authenticate }, async (request, reply) => {
        try {
            const { userId } = request.body;
            if (!userId) {
                return reply.code(400).send({ error: 'User ID is required' });
            }
            const currentUserId = request.user.id;
            // Check if target user exists
            const targetUser = userService.getUserById(userId);
            if (!targetUser) {
                return reply.code(404).send({ error: 'User not found' });
            }
            // Check if trying to add self
            if (userId === currentUserId) {
                return reply.code(400).send({ error: 'Cannot send friend request to yourself' });
            }
            // Create and store the friend request
            const friendRequest = userService.createFriendRequest(currentUserId, userId);
            reply.send(friendRequest);
        }
        catch (error) {
            console.error('Send friend request error:', error);
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
    fastify.post('/users/friend-request/:id/respond', { preHandler: auth_1.authenticate }, async (request, reply) => {
        try {
            const { id: requestId } = request.params;
            const { response: responseType } = request.body;
            if (!responseType || !['accepted', 'declined'].includes(responseType)) {
                return reply.code(400).send({ error: 'Invalid response type' });
            }
            const userId = request.user.id;
            userService.respondToFriendRequest(requestId, userId, responseType);
            reply.send({ message: `Friend request ${responseType}` });
        }
        catch (error) {
            console.error('Respond to friend request error:', error);
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
    fastify.delete('/users/friends/:id', { preHandler: auth_1.authenticate }, async (request, reply) => {
        reply.send({ message: 'Friend system not implemented in simplified version' });
    });
    fastify.get('/users/search', { preHandler: auth_1.authenticate }, async (request, reply) => {
        try {
            const { q } = request.query;
            if (!q || q.trim().length < 2) {
                return reply.code(400).send({ error: 'Search query must be at least 2 characters' });
            }
            const searchQuery = q.trim().toLowerCase();
            // Get all users and filter by username (case-insensitive partial match)
            const allUsers = userService.getAllUsers();
            const searchResults = allUsers
                .filter(user => user.username.toLowerCase().includes(searchQuery) &&
                user.id !== request.user.id // Exclude current user
            )
                .slice(0, 10) // Limit to 10 results
                .map(user => {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            });
            reply.send(searchResults);
        }
        catch (error) {
            console.error('Search users error:', error);
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
    fastify.get('/users/:id/matches', { preHandler: auth_1.authenticate }, async (request, reply) => {
        reply.send([]);
    });
    fastify.get('/leaderboard', { preHandler: auth_1.authenticate }, async (request, reply) => {
        reply.send([]);
    });
}
//# sourceMappingURL=users.js.map