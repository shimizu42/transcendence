import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/UserService';
import { authenticate } from '../middleware/auth';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';


export async function userRoutes(fastify: FastifyInstance) {
  const userService = (fastify as any).userService as UserService;

  // Get online users for the game lobby
  fastify.get('/users', { preHandler: authenticate }, async (request: any, reply: FastifyReply) => {
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
  fastify.get('/users/profile', { preHandler: authenticate }, async (request: any, reply: FastifyReply) => {
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

  // Profile update endpoint
  fastify.put('/users/profile', { preHandler: authenticate }, async (request: any, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const { displayName, bio } = request.body as { displayName?: string; bio?: string };

      const updateResult = userService.updateUserProfile(userId, { displayName, bio });

      if (updateResult) {
        const updatedUser = userService.getUserById(userId);
        if (updatedUser) {
          const { password, ...userWithoutPassword } = updatedUser;
          reply.send(userWithoutPassword);
        }
      } else {
        reply.code(500).send({ error: 'Failed to update profile' });
      }
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Avatar upload endpoint
  fastify.post('/users/avatar', { preHandler: authenticate }, async (request: any, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      console.log('Avatar upload request from user:', userId);

      const parts = request.parts();
      let fileData: any = null;

      for await (const part of parts) {
        if (part.type === 'file') {
          fileData = part;
          break;
        }
      }

      console.log('File data:', fileData ? 'File received' : 'No file');
      if (!fileData) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(fileData.mimetype)) {
        return reply.code(400).send({ error: 'Invalid file type. Only JPG and PNG files are allowed.' });
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      const buffer = await fileData.toBuffer();
      if (buffer.length > maxSize) {
        return reply.code(400).send({ error: 'File too large. Maximum size is 5MB.' });
      }

      // Generate unique filename
      const fileExtension = fileData.mimetype === 'image/jpeg' ? 'jpg' : 'png';
      const filename = `${userId}-${crypto.randomUUID()}.${fileExtension}`;
      const uploadPath = path.join(process.cwd(), 'uploads', 'avatars', filename);

      // Ensure uploads directory exists
      const uploadsDir = path.dirname(uploadPath);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Delete old avatar if exists
      const currentUser = userService.getUserById(userId);
      if (currentUser?.avatar && !currentUser.avatar.includes('default.svg')) {
        const oldAvatarPath = path.join(process.cwd(), 'uploads', 'avatars', path.basename(currentUser.avatar));
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      // Save file
      fs.writeFileSync(uploadPath, buffer);

      // Verify user exists before updating avatar
      const user = userService.getUserById(userId);
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Update user avatar in database
      const avatarUrl = `/api/avatars/avatars/${filename}`;
      console.log('Attempting to update avatar URL:', avatarUrl, 'for user:', userId);
      const updateResult = userService.updateUserAvatar(userId, avatarUrl);
      console.log('Update result:', updateResult);

      if (updateResult) {
        console.log('Avatar uploaded successfully:', avatarUrl);
        reply.send({ avatarUrl });
      } else {
        console.error('Failed to update avatar in database');
        // Clean up uploaded file if database update failed
        if (fs.existsSync(uploadPath)) {
          fs.unlinkSync(uploadPath);
        }
        reply.code(500).send({ error: 'Failed to update avatar' });
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      reply.code(500).send({ error: `Internal server error: ${(error as Error).message || 'Unknown error'}` });
    }
  });

  // Get user by ID
  fastify.get('/users/:id', { preHandler: authenticate }, async (request: any, reply: FastifyReply) => {
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
  fastify.get('/users/:id/stats', { preHandler: authenticate }, async (request: any, reply: FastifyReply) => {
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
  fastify.get('/users/friends', { preHandler: authenticate }, async (request: any, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const friends = userService.getFriends(userId);
      reply.send(friends);
    } catch (error) {
      console.error('Get friends error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.get('/users/friend-requests', { preHandler: authenticate }, async (request: any, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const friendRequests = userService.getFriendRequests(userId);
      reply.send(friendRequests);
    } catch (error) {
      console.error('Get friend requests error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/users/friend-request', { preHandler: authenticate }, async (request: any, reply: FastifyReply) => {
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

  fastify.post('/users/friend-request/:id/respond', { preHandler: authenticate }, async (request: any, reply: FastifyReply) => {
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

  fastify.delete('/users/friends/:id', { preHandler: authenticate }, async (request: any, reply: FastifyReply) => {
    reply.send({ message: 'Friend system not implemented in simplified version' });
  });

  fastify.get('/users/search', { preHandler: authenticate }, async (request: any, reply: FastifyReply) => {
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

  fastify.get('/users/:id/matches', { preHandler: authenticate }, async (request: any, reply: FastifyReply) => {
    reply.send([]);
  });

  fastify.get('/leaderboard', { preHandler: authenticate }, async (request: any, reply: FastifyReply) => {
    reply.send([]);
  });
}