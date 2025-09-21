import { FastifyInstance } from 'fastify';
import { UserService } from '../services/UserService';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
// import multipart from '@fastify/multipart';
// import fs from 'fs';
// import path from 'path';
// import { pipeline } from 'stream';
// import { promisify } from 'util';

// const pump = promisify(pipeline);

export async function userRoutes(fastify: FastifyInstance) {
  const userService = (fastify as any).userService as UserService;

  // Register multipart support for file uploads (temporarily disabled)
  // await fastify.register(multipart);

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

  // Profile update routes
  fastify.put('/users/profile', async (request: AuthenticatedRequest, reply) => {
    try {
      if (!request.user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { displayName, bio, email } = request.body as {
        displayName?: string;
        bio?: string;
        email?: string;
      };

      const updatedUser = userService.updateUserProfile(request.user.id, {
        displayName,
        bio,
        email
      });

      if (!updatedUser) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      reply.send(userWithoutPassword);
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Avatar upload route (temporarily disabled due to multipart issues)
  /*
  fastify.post('/users/avatar', async (request: AuthenticatedRequest, reply) => {
    // ... avatar upload code temporarily disabled
  });

  // Get default avatars
  fastify.get('/users/avatars/default', async (request: AuthenticatedRequest, reply) => {
    // ... temporarily disabled
  });

  // Set default avatar
  fastify.post('/users/avatar/default', async (request: AuthenticatedRequest, reply) => {
    // ... temporarily disabled
  });
  */

  // Friend system routes
  fastify.get('/users/friends', async (request: AuthenticatedRequest, reply) => {
    try {
      if (!request.user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const friends = userService.getFriends(request.user.id);
      const friendsWithoutPassword = friends.map(friend => {
        const { password, ...friendWithoutPassword } = friend;
        return friendWithoutPassword;
      });

      reply.send(friendsWithoutPassword);
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.get('/users/friend-requests', async (request: AuthenticatedRequest, reply) => {
    try {
      if (!request.user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const requests = userService.getFriendRequests(request.user.id);

      // Add user details to requests
      const requestsWithUserDetails = requests.map(request => {
        const fromUser = userService.getUserById(request.fromUserId);
        return {
          ...request,
          fromUser: fromUser ? {
            id: fromUser.id,
            username: fromUser.username,
            displayName: fromUser.displayName,
            avatar: fromUser.avatar
          } : null
        };
      });

      reply.send(requestsWithUserDetails);
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/users/friend-request', async (request: AuthenticatedRequest, reply) => {
    try {
      if (!request.user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { toUserId } = request.body as { toUserId: string };

      const friendRequest = userService.sendFriendRequest(request.user.id, toUserId);

      if (!friendRequest) {
        return reply.code(400).send({ error: 'Cannot send friend request' });
      }

      reply.send(friendRequest);
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/users/friend-request/:id/respond', async (request: AuthenticatedRequest, reply) => {
    try {
      if (!request.user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };
      const { response } = request.body as { response: 'accepted' | 'declined' };

      if (!['accepted', 'declined'].includes(response)) {
        return reply.code(400).send({ error: 'Invalid response' });
      }

      const success = userService.respondToFriendRequest(request.user.id, id, response);

      if (!success) {
        return reply.code(404).send({ error: 'Friend request not found' });
      }

      reply.send({ success: true });
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.delete('/users/friends/:id', async (request: AuthenticatedRequest, reply) => {
    try {
      if (!request.user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };

      const success = userService.removeFriend(request.user.id, id);

      if (!success) {
        return reply.code(404).send({ error: 'Friend not found' });
      }

      reply.send({ success: true });
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Search users
  fastify.get('/users/search', async (request: AuthenticatedRequest, reply) => {
    try {
      if (!request.user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { q } = request.query as { q: string };

      if (!q || q.length < 2) {
        return reply.code(400).send({ error: 'Query must be at least 2 characters' });
      }

      const users = userService.searchUsers(q, request.user.id);
      const usersWithoutPassword = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      reply.send(usersWithoutPassword);
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Statistics routes
  fastify.get('/users/:id/stats', async (request: AuthenticatedRequest, reply) => {
    try {
      const { id } = request.params as { id: string };
      const stats = userService.getUserStats(id);

      if (!stats) {
        return reply.code(404).send({ error: 'User not found' });
      }

      reply.send(stats);
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Match history
  fastify.get('/users/:id/matches', async (request: AuthenticatedRequest, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { limit = '20', offset = '0' } = request.query as { limit?: string; offset?: string };

      const matches = userService.getMatchHistory(id, parseInt(limit), parseInt(offset));
      reply.send(matches);
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Leaderboard
  fastify.get('/leaderboard', async (request: AuthenticatedRequest, reply) => {
    try {
      const { gameType, limit = '10' } = request.query as {
        gameType?: 'pong' | 'tank';
        limit?: string;
      };

      const leaderboard = userService.getLeaderboard(gameType, parseInt(limit));

      // Remove passwords from user data
      const leaderboardWithoutPasswords = leaderboard.map(entry => ({
        ...entry,
        user: {
          ...entry.user,
          password: undefined
        }
      }));

      reply.send(leaderboardWithoutPasswords);
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
}