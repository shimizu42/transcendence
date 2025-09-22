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
    try {
      const userId = request.user!.id;
      const friends = userService.getFriends(userId);
      reply.send(friends);
    } catch (error) {
      console.error('Get friends error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.get('/users/friend-requests', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.user!.id;
      const friendRequests = userService.getFriendRequests(userId);
      reply.send(friendRequests);
    } catch (error) {
      console.error('Get friend requests error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/users/friend-request', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { userId } = request.body as { userId?: string };

      if (!userId) {
        return reply.code(400).send({ error: 'User ID is required' });
      }

      const currentUserId = request.user!.id;

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
    } catch (error) {
      console.error('Send friend request error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/users/friend-request/:id/respond', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { id: requestId } = request.params as { id: string };
      const { response: responseType } = request.body as { response: 'accepted' | 'declined' };

      if (!responseType || !['accepted', 'declined'].includes(responseType)) {
        return reply.code(400).send({ error: 'Invalid response type' });
      }

      const userId = request.user!.id;
      userService.respondToFriendRequest(requestId, userId, responseType);

      reply.send({ message: `Friend request ${responseType}` });
    } catch (error) {
      console.error('Respond to friend request error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.delete('/users/friends/:id', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    reply.send({ message: 'Friend system not implemented in simplified version' });
  });

  fastify.get('/users/search', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { q } = request.query as { q?: string };

      if (!q || q.trim().length < 2) {
        return reply.code(400).send({ error: 'Search query must be at least 2 characters' });
      }

      const searchQuery = q.trim().toLowerCase();

      // Get all users and filter by username (case-insensitive partial match)
      const allUsers = userService.getAllUsers();
      const searchResults = allUsers
        .filter(user =>
          user.username.toLowerCase().includes(searchQuery) &&
          user.id !== request.user!.id // Exclude current user
        )
        .slice(0, 10) // Limit to 10 results
        .map(user => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });

      reply.send(searchResults);
    } catch (error) {
      console.error('Search users error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.get('/users/:id/matches', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    reply.send([]);
  });

  fastify.get('/leaderboard', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    reply.send([]);
  });
}