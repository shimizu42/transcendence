"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameRoutes = gameRoutes;
const auth_1 = require("../middleware/auth");
async function gameRoutes(fastify) {
    const gameService = fastify.gameService;
    const userService = fastify.userService;
    fastify.addHook('onRequest', auth_1.authenticate);
    fastify.post('/game/invite', async (request, reply) => {
        try {
            const { toUserId } = request.body;
            const fromUserId = request.user.id;
            if (!toUserId) {
                return reply.code(400).send({ error: 'toUserId is required' });
            }
            if (fromUserId === toUserId) {
                return reply.code(400).send({ error: 'Cannot invite yourself' });
            }
            const toUser = userService.getUserById(toUserId);
            if (!toUser || !toUser.isOnline || toUser.isInGame) {
                return reply.code(400).send({ error: 'User is not available for a game' });
            }
            const invitation = gameService.createInvitation(fromUserId, toUserId);
            reply.send(invitation);
        }
        catch (error) {
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
    fastify.post('/game/invite/:id/accept', async (request, reply) => {
        try {
            const { id } = request.params;
            const userId = request.user.id;
            const invitation = gameService.getInvitation(id);
            if (!invitation || invitation.toUserId !== userId) {
                return reply.code(404).send({ error: 'Invitation not found' });
            }
            const game = gameService.acceptInvitation(id);
            if (!game) {
                return reply.code(400).send({ error: 'Cannot accept invitation' });
            }
            // Set all players in game
            game.playerIds.forEach(playerId => {
                userService.setUserInGame(playerId, true);
            });
            reply.send(game);
        }
        catch (error) {
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
    fastify.post('/game/invite/:id/decline', async (request, reply) => {
        try {
            const { id } = request.params;
            const userId = request.user.id;
            const invitation = gameService.getInvitation(id);
            if (!invitation || invitation.toUserId !== userId) {
                return reply.code(404).send({ error: 'Invitation not found' });
            }
            const success = gameService.declineInvitation(id);
            if (!success) {
                return reply.code(400).send({ error: 'Cannot decline invitation' });
            }
            reply.send({ success: true });
        }
        catch (error) {
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
    fastify.get('/game/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const game = gameService.getGame(id);
            if (!game) {
                return reply.code(404).send({ error: 'Game not found' });
            }
            reply.send(game);
        }
        catch (error) {
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
}
//# sourceMappingURL=game.js.map