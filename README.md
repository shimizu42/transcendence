# Pong Tournament

A web-based Pong tournament platform built for the 42 School transcendence project.

## Features

- **Real-time Pong Game**: Classic Pong gameplay with smooth controls
- **Tournament System**: Multi-player bracket-style tournaments
- **Player Registration**: Simple alias-based player management
- **Security**: XSS protection, input validation, HTTPS enforcement
- **Single Page Application**: Browser back/forward button support
- **Docker Deployment**: Single command deployment

## Quick Start

1. **Start the application**:
   ```bash
   docker-compose up --build
   ```

2. **Access the application**:
   - Open your browser to `https://localhost`
   - Accept the self-signed certificate warning

## Game Controls

- **Player 1**: W (up) / S (down)
- **Player 2**: ↑ (up) / ↓ (down)
- **Start Game**: Spacebar
- **Restart**: R (when game ends)

## Tournament Flow

1. Go to "Start Tournament"
2. Add players (minimum 2 required)
3. Click "Start Tournament" to generate bracket
4. Play matches in order using "Play Next Match"
5. Tournament automatically tracks winners and advances bracket

## Architecture

### Frontend
- **TypeScript** with vanilla DOM manipulation
- **Canvas-based** Pong game implementation
- **SPA routing** with history management
- **Security utilities** for input validation and XSS prevention

### Backend
- **Node.js** with Fastify framework
- **WebSocket** support for future real-time features
- **Security middleware** (Helmet, CORS, Rate Limiting)
- **Health monitoring** endpoint

### Docker
- **Multi-service** setup with frontend and backend
- **HTTPS/SSL** with self-signed certificates
- **Nginx** reverse proxy for frontend
- **Production-ready** configuration

## Security Features

- Content Security Policy (CSP) headers
- XSS protection and input sanitization
- Rate limiting for API endpoints
- HTTPS-only communication (WSS for WebSockets)
- Input validation and error handling

## Development

### Frontend Development
```bash
cd frontend
npm install
npm run build
```

### Backend Development
```bash
cd backend
npm install
npm run build
npm start
```

### Building for Production
```bash
docker-compose up --build
```

## Project Structure

```
transcendence/
├── frontend/
│   ├── src/
│   │   ├── game/          # Pong game implementation
│   │   ├── tournament/    # Tournament management
│   │   ├── utils/         # Security and SPA utilities
│   │   ├── index.html     # Main HTML template
│   │   └── main.ts        # Application entry point
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── backend/
│   ├── src/
│   │   └── server.ts      # Fastify server
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── CLAUDE.md
└── README.md
```

## Requirements Compliance

This implementation satisfies the 42 School transcendence project requirements:

- ✅ Single Page Application with browser navigation
- ✅ TypeScript frontend
- ✅ Real-time multiplayer Pong game
- ✅ Tournament system with player registration
- ✅ Docker deployment
- ✅ HTTPS/WSS security
- ✅ Input validation and XSS protection
- ✅ Firefox compatibility

## Browser Compatibility

- Tested on latest stable Mozilla Firefox
- Compatible with modern Chrome and Safari
- Requires JavaScript enabled
- Uses modern web APIs (Canvas, WebSockets, Crypto)