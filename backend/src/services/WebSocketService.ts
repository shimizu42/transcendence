import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { UserService } from './UserService';
import { GameService } from './GameService';
import { verifyToken } from '../middleware/auth';

interface SocketConnection {
  socket: WebSocket;
  userId?: string;
}

export class WebSocketService {
  private connections: Map<string, SocketConnection> = new Map();
  private userService: UserService;
  private gameService: GameService;

  constructor(userService: UserService, gameService: GameService) {
    this.userService = userService;
    this.gameService = gameService;
  }

  handleConnection(connection: WebSocket, request: any): void {
    const connectionId = this.generateConnectionId();
    this.connections.set(connectionId, { socket: connection });

    connection.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleMessage(connectionId, data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    connection.on('close', () => {
      this.handleDisconnection(connectionId);
    });

    connection.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnection(connectionId);
    });
  }

  private handleMessage(connectionId: string, message: { type: string; data: any }): void {
    console.log('WebSocket: Received message', { connectionId, type: message.type, data: message.data });
    const connection = this.connections.get(connectionId);
    if (!connection) {
      console.error('WebSocket: Connection not found for', connectionId);
      return;
    }

    switch (message.type) {
      case 'authenticate':
        this.handleAuthentication(connectionId, message.data);
        break;
      case 'gameInvite':
        this.handleGameInvite(connectionId, message.data);
        break;
      case 'gameInviteResponse':
        this.handleGameInviteResponse(connectionId, message.data);
        break;
      case 'joinGame':
        this.handleJoinGame(connectionId, message.data);
        break;
      case 'paddleMove':
        this.handlePaddleMove(connectionId, message.data);
        break;
      case 'leaveGame':
        this.handleLeaveGame(connectionId, message.data);
        break;
    }
  }

  private handleAuthentication(connectionId: string, data: { token: string }): void {
    console.log('WebSocket: Handling authentication for connection', connectionId);
    const user = verifyToken(data.token);
    if (!user) {
      console.error('WebSocket: Invalid token for connection', connectionId);
      this.sendToConnection(connectionId, 'authError', { message: 'Invalid token' });
      return;
    }

    console.log('WebSocket: User authenticated', { userId: user.id, username: user.username });
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.userId = user.id;
      this.userService.setUserOnline(user.id, connectionId);
      this.broadcastUserUpdate();
      this.sendToConnection(connectionId, 'authenticated', { user });
      console.log('WebSocket: Authentication successful for', user.username);
    }
  }

  private handleGameInvite(connectionId: string, data: { toUserId: string }): void {
    console.log('WebSocket: Handling game invite', { connectionId, toUserId: data.toUserId });
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.userId) {
      console.error('WebSocket: Invalid connection for game invite', connectionId);
      return;
    }

    const fromUser = this.userService.getUserById(connection.userId);
    const toUser = this.userService.getUserById(data.toUserId);
    
    console.log('WebSocket: Game invite users', { 
      fromUser: fromUser?.username, 
      toUser: toUser?.username,
      toUserOnline: toUser?.isOnline,
      toUserInGame: toUser?.isInGame 
    });
    
    if (!fromUser || !toUser || !toUser.isOnline || toUser.isInGame) {
      console.log('WebSocket: User not available for game invite');
      this.sendToConnection(connectionId, 'inviteError', { message: 'User not available' });
      return;
    }

    const invitation = this.gameService.createInvitation(fromUser.id, toUser.id);
    console.log('WebSocket: Created invitation', invitation.id);
    
    const toConnection = this.findConnectionByUserId(toUser.id);
    if (toConnection) {
      console.log('WebSocket: Sending invitation to target user');
      this.sendToConnection(toConnection, 'gameInvitation', {
        id: invitation.id,
        fromUser: { id: fromUser.id, username: fromUser.username }
      });
    } else {
      console.error('WebSocket: Target user connection not found');
    }
  }

  private handleGameInviteResponse(connectionId: string, data: { invitationId: string; response: 'accept' | 'decline' }): void {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.userId) return;

    const invitation = this.gameService.getInvitation(data.invitationId);
    if (!invitation || invitation.toUserId !== connection.userId) return;

    if (data.response === 'accept') {
      const game = this.gameService.acceptInvitation(data.invitationId);
      if (game) {
        this.userService.setUserInGame(game.player1Id, true);
        this.userService.setUserInGame(game.player2Id, true);

        const player1Connection = this.findConnectionByUserId(game.player1Id);
        const player2Connection = this.findConnectionByUserId(game.player2Id);

        if (player1Connection) {
          this.sendToConnection(player1Connection, 'gameStart', { gameId: game.id });
          this.sendToConnection(player1Connection, 'playerAssignment', { playerId: game.player1Id, playerNumber: 1 });
        }
        if (player2Connection) {
          this.sendToConnection(player2Connection, 'gameStart', { gameId: game.id });
          this.sendToConnection(player2Connection, 'playerAssignment', { playerId: game.player2Id, playerNumber: 2 });
        }

        this.gameService.startGame(game.id);
        this.startGameStateUpdates(game.id);
        this.broadcastUserUpdate();
      }
    } else {
      this.gameService.declineInvitation(data.invitationId);
      const fromConnection = this.findConnectionByUserId(invitation.fromUserId);
      if (fromConnection) {
        this.sendToConnection(fromConnection, 'inviteDeclined', {});
      }
    }
  }

  private handleJoinGame(connectionId: string, data: { gameId: string }): void {
    const game = this.gameService.getGame(data.gameId);
    if (game) {
      this.sendGameState(data.gameId);
    }
  }

  private handlePaddleMove(connectionId: string, data: { gameId: string; direction: number }): void {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.userId) return;

    this.gameService.updatePaddle(data.gameId, connection.userId, data.direction);
  }

  private handleLeaveGame(connectionId: string, data: { gameId: string }): void {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.userId) return;

    const game = this.gameService.getGame(data.gameId);
    if (game) {
      this.gameService.endGame(data.gameId);
      this.userService.setUserInGame(game.player1Id, false);
      this.userService.setUserInGame(game.player2Id, false);
      this.broadcastUserUpdate();
    }
  }

  private handleDisconnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.userId) {
      this.userService.setUserOffline(connection.userId);
      this.broadcastUserUpdate();
    }
    this.connections.delete(connectionId);
  }

  private startGameStateUpdates(gameId: string): void {
    const interval = setInterval(() => {
      const game = this.gameService.getGame(gameId);
      if (!game || game.status === 'finished') {
        clearInterval(interval);
        if (game && game.status === 'finished') {
          this.sendGameEnd(gameId, game.winner!);
          this.userService.setUserInGame(game.player1Id, false);
          this.userService.setUserInGame(game.player2Id, false);
          this.broadcastUserUpdate();
        }
        return;
      }
      this.sendGameState(gameId);
    }, 16);
  }

  private sendGameState(gameId: string): void {
    const game = this.gameService.getGame(gameId);
    if (!game) return;

    const player1 = this.userService.getUserById(game.player1Id);
    const player2 = this.userService.getUserById(game.player2Id);

    const gameState = {
      player1: {
        id: game.player1Id,
        username: player1?.username || 'Player 1',
        score: game.player1Score,
        paddleY: game.player1PaddleY
      },
      player2: {
        id: game.player2Id,
        username: player2?.username || 'Player 2',
        score: game.player2Score,
        paddleY: game.player2PaddleY
      },
      ball: {
        x: game.ballX,
        y: game.ballY,
        z: game.ballZ,
        velocityX: game.ballVelocityX,
        velocityY: game.ballVelocityY,
        velocityZ: game.ballVelocityZ
      },
      gameStatus: game.status,
      winner: game.winner
    };

    const player1Connection = this.findConnectionByUserId(game.player1Id);
    const player2Connection = this.findConnectionByUserId(game.player2Id);

    if (player1Connection) {
      this.sendToConnection(player1Connection, 'gameState', gameState);
    }
    if (player2Connection) {
      this.sendToConnection(player2Connection, 'gameState', gameState);
    }
  }

  private sendGameEnd(gameId: string, winnerId: string): void {
    const game = this.gameService.getGame(gameId);
    if (!game) return;

    const winner = this.userService.getUserById(winnerId);
    const player1Connection = this.findConnectionByUserId(game.player1Id);
    const player2Connection = this.findConnectionByUserId(game.player2Id);

    const endData = { winner: winner?.username || 'Unknown' };

    if (player1Connection) {
      this.sendToConnection(player1Connection, 'gameEnd', endData);
    }
    if (player2Connection) {
      this.sendToConnection(player2Connection, 'gameEnd', endData);
    }
  }

  private broadcastUserUpdate(): void {
    const users = this.userService.getOnlineUsers().map(user => ({
      id: user.id,
      username: user.username,
      isOnline: user.isOnline,
      isInGame: user.isInGame
    }));

    this.connections.forEach((connection) => {
      if (connection.userId) {
        this.sendToConnection(connection.socket, 'userUpdate', users);
      }
    });
  }

  private findConnectionByUserId(userId: string): WebSocket | null {
    for (const connection of this.connections.values()) {
      if (connection.userId === userId) {
        return connection.socket;
      }
    }
    return null;
  }

  private sendToConnection(target: string | WebSocket, type: string, data: any): void {
    try {
      const socket = typeof target === 'string' 
        ? this.connections.get(target)?.socket 
        : target;
        
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type, data }));
      }
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
    }
  }

  private generateConnectionId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}