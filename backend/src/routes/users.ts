import { FastifyInstance } from 'fastify';
import { UserService } from '../services/UserService';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

export async function userRoutes(fastify: FastifyInstance) {
  const userService = (fastify as any).userService as UserService;

  // Get online users for the game lobby
  fastify.get('/users', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const users = userService.getOnlineUsers().map((user: any) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      reply.send(users);
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get current user profile
  fastify.get('/users/profile', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.user!.id;
      const user = userService.getUserById(userId);

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const { password, ...userWithoutPassword } = user;
      reply.send(userWithoutPassword);
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Simplified profile update (basic info only)
  fastify.put('/users/profile', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.user!.id;
      reply.send({ message: 'Profile update not implemented in simplified version' });
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get user by ID
  fastify.get('/users/:id', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
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

  // Basic stats endpoint
  fastify.get('/users/:id/stats', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = userService.getUserById(id);

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      reply.send(user.stats);
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Placeholder endpoints for frontend compatibility
  fastify.get('/users/friends', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    reply.send([]);
  });

  fastify.get('/users/friend-requests', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    reply.send([]);
  });

  fastify.post('/users/friend-request', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    reply.send({ message: 'Friend system not implemented in simplified version' });
  });

  fastify.post('/users/friend-request/:id/respond', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    reply.send({ message: 'Friend system not implemented in simplified version' });
  });

  fastify.delete('/users/friends/:id', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    reply.send({ message: 'Friend system not implemented in simplified version' });
  });

  fastify.get('/users/search', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    reply.send([]);
  });

  fastify.get('/users/:id/matches', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    reply.send([]);
  });

  fastify.get('/leaderboard', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    reply.send([]);
  });
}