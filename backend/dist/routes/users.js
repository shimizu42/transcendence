"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = userRoutes;
const auth_1 = require("../middleware/auth");
async function userRoutes(fastify) {
    const userService = fastify.userService;
    fastify.addHook('onRequest', auth_1.authenticate);
    fastify.get('/users', async (request, reply) => {
        try {
            const users = userService.getOnlineUsers();
            const usersWithoutPassword = users.map(user => {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            });
            reply.send(usersWithoutPassword);
        }
        catch (error) {
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
    fastify.get('/users/:id', async (request, reply) => {
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
}
//# sourceMappingURL=users.js.map