"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const static_1 = __importDefault(require("@fastify/static"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const auth_1 = require("./routes/auth");
const users_1 = require("./routes/users");
const game_1 = require("./routes/game");
const UserService_1 = require("./services/UserService");
const GameService_1 = require("./services/GameService");
const TankGameService_1 = require("./services/TankGameService");
const WebSocketService_1 = require("./services/WebSocketService");
const DatabaseService_1 = require("./database/DatabaseService");
const path_1 = __importDefault(require("path"));
const fastify = (0, fastify_1.default)({
    logger: true
});
fastify.register(websocket_1.default);
fastify.register(multipart_1.default, {
    attachFieldsToBody: true,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});
// Serve static files for avatar uploads
fastify.register(static_1.default, {
    root: path_1.default.join(process.cwd(), 'uploads'),
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
    const db = DatabaseService_1.DatabaseService.getInstance();
    await db.initialize();
    const userService = new UserService_1.UserService();
    const gameService = new GameService_1.GameService(userService);
    const tankGameService = new TankGameService_1.TankGameService(userService);
    const webSocketService = new WebSocketService_1.WebSocketService(userService, gameService, tankGameService);
    return { userService, gameService, tankGameService, webSocketService };
};
const servicesPromise = initializeServer();
fastify.register(async function (fastify) {
    const { userService, gameService } = await servicesPromise;
    // Pass userService and gameService to routes
    fastify.decorate('userService', userService);
    fastify.decorate('gameService', gameService);
    await fastify.register(auth_1.authRoutes);
    await fastify.register(users_1.userRoutes);
    await fastify.register(game_1.gameRoutes);
});
fastify.register(async function (fastify) {
    const { webSocketService } = await servicesPromise;
    fastify.get('/ws', { websocket: true }, (connection, request) => {
        webSocketService.handleConnection(connection, request);
    });
});
fastify.get('/health', async () => {
    return { status: 'OK', timestamp: new Date().toISOString() };
});
const start = async () => {
    try {
        await fastify.listen({ port: 3001, host: '0.0.0.0' });
        console.log('Server is running on http://localhost:3001');
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map