"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = userRoutes;
const auth_1 = require("../middleware/auth");
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
    // Simplified profile update (basic info only)
    fastify.put('/users/profile', { preHandler: auth_1.authenticate }, async (request, reply) => {
        try {
            const userId = request.user.id;
            reply.send({ message: 'Profile update not implemented in simplified version' });
        }
        catch (error) {
            reply.code(500).send({ error: 'Internal server error' });
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
        reply.send([]);
    });
    fastify.get('/users/friend-requests', { preHandler: auth_1.authenticate }, async (request, reply) => {
        reply.send([]);
    });
    fastify.post('/users/friend-request', { preHandler: auth_1.authenticate }, async (request, reply) => {
        reply.send({ message: 'Friend system not implemented in simplified version' });
    });
    fastify.post('/users/friend-request/:id/respond', { preHandler: auth_1.authenticate }, async (request, reply) => {
        reply.send({ message: 'Friend system not implemented in simplified version' });
    });
    fastify.delete('/users/friends/:id', { preHandler: auth_1.authenticate }, async (request, reply) => {
        reply.send({ message: 'Friend system not implemented in simplified version' });
    });
    fastify.get('/users/search', { preHandler: auth_1.authenticate }, async (request, reply) => {
        reply.send([]);
    });
    fastify.get('/users/:id/matches', { preHandler: auth_1.authenticate }, async (request, reply) => {
        reply.send([]);
    });
    fastify.get('/leaderboard', { preHandler: auth_1.authenticate }, async (request, reply) => {
        reply.send([]);
    });
}
//# sourceMappingURL=users.js.map