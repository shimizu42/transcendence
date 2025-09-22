"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const auth_1 = require("../middleware/auth");
async function authRoutes(fastify) {
    const userService = fastify.userService;
    fastify.post('/auth/register', async (request, reply) => {
        try {
            const { username, password } = request.body;
            if (!username || !password) {
                return reply.code(400).send({ error: 'Username and password are required' });
            }
            if (username.length < 3 || password.length < 6) {
                return reply.code(400).send({ error: 'Username must be at least 3 characters and password at least 6 characters' });
            }
            const user = await userService.createUser(username, password);
            const { password: _, ...userWithoutPassword } = user;
            reply.send(userWithoutPassword);
        }
        catch (error) {
            if (error instanceof Error && error.message === 'Username already exists') {
                return reply.code(409).send({ error: 'Username already exists' });
            }
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
    fastify.post('/auth/login', async (request, reply) => {
        try {
            const { username, password } = request.body;
            if (!username || !password) {
                return reply.code(400).send({ error: 'Username and password are required' });
            }
            const user = await userService.getUserByUsername(username);
            if (!user || !(await userService.validatePassword(username, password))) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }
            const token = (0, auth_1.generateToken)({ id: user.id, username: user.username });
            const { password: _, ...userWithoutPassword } = user;
            reply.send({
                user: userWithoutPassword,
                token
            });
        }
        catch (error) {
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
}
//# sourceMappingURL=auth.js.map