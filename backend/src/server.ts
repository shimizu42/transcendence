import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';

const server = fastify({
    logger: {
        level: 'info',
        transport: {
            target: 'pino-pretty'
        }
    }
});

// Register security plugins
server.register(helmet, {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "wss:", "ws:"],
        },
    },
});

server.register(cors, {
    origin: ['https://localhost', 'https://127.0.0.1'],
    credentials: true
});

server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
});

server.register(websocket);

// Health check endpoint
server.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
});

// WebSocket for real-time game updates (if needed for remote players module)
server.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
        connection.socket.on('message', (message: any) => {
            // Echo back for now - in full implementation would handle game state
            connection.socket.send(`Echo: ${message}`);
        });
        
        connection.socket.on('close', () => {
            console.log('WebSocket connection closed');
        });
    });
});

const start = async (): Promise<void> => {
    try {
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
        const host = process.env.HOST || '0.0.0.0';
        
        await server.listen({ port, host });
        console.log(`Server listening on https://${host}:${port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await server.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await server.close();
    process.exit(0);
});

start();