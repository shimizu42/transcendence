import { FastifyInstance } from 'fastify';
import { UserService } from '../services/UserService';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

export async function userRoutes(fastify: FastifyInstance) {
  const userService = (fastify as any).userService as UserService;

  fastify.addHook('onRequest', authenticate);

  fastify.get('/users', async (request: AuthenticatedRequest, reply) => {
    try {
      const users = userService.getOnlineUsers();
      const usersWithoutPassword = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      reply.send(usersWithoutPassword);
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.get('/users/:id', async (request: AuthenticatedRequest, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = userService.getUserById(id);

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const { password, ...userWithoutPassword } = user;
      reply.send(userWithoutPassword);
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
}