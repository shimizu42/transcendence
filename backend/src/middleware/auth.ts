import { FastifyRequest, FastifyReply } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'your-secret-key';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    username: string;
  };
}

export function generateToken(user: { id: string; username: string }): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}

export async function authenticate(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Authorization header missing or invalid' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
    request.user = decoded;
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
}

export function verifyToken(token: string): { id: string; username: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; username: string };
  } catch (error) {
    return null;
  }
}