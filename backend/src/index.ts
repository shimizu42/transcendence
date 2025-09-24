import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import staticFiles from '@fastify/static';
import multipart from '@fastify/multipart';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { gameRoutes } from './routes/game';
import { UserService } from './services/UserService';
import { GameService } from './services/GameService';
import { TankGameService } from './services/TankGameService';
import { WebSocketService } from './services/WebSocketService';
import { DatabaseService } from './database/DatabaseService';
import path from 'path';

const fastify = Fastify({
  logger: true
});

fastify.register(websocket);
fastify.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Serve static files for avatar uploads
fastify.register(staticFiles, {
  root: path.join(process.cwd(), 'uploads'),
  prefix: '/api/avatars/',
  decorateReply: false
});

// Add CORS support globally
fastify.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
});

// Handle OPTIONS requests globally
fastify.addHook('preHandler', async (request, reply) => {
  if (request.method === 'OPTIONS') {
    reply.code(200).send();
    return reply;
  }
});

// Initialize database first
const initializeServer = async () => {
  const db = DatabaseService.getInstance();
  await db.initialize();

  const userService = new UserService();
  const gameService = new GameService(userService);
  const tankGameService = new TankGameService(userService);
  const webSocketService = new WebSocketService(userService, gameService, tankGameService);

  return { userService, gameService, tankGameService, webSocketService };
};

const servicesPromise = initializeServer();

fastify.register(async function (fastify) {
  const { userService, gameService } = await servicesPromise;

  // Pass userService and gameService to routes
  fastify.decorate('userService', userService);
  fastify.decorate('gameService', gameService);
  
  await fastify.register(authRoutes);
  await fastify.register(userRoutes);
  await fastify.register(gameRoutes);
});

fastify.register(async function (fastify) {
  const { webSocketService } = await servicesPromise;

  fastify.get('/ws', { websocket: true }, (connection, request) => {
    webSocketService.handleConnection(connection as any, request);
  });
});

fastify.get('/health', async () => {
  return { status: 'OK', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Server is running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();