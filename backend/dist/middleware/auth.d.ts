import { FastifyRequest, FastifyReply } from 'fastify';
export interface AuthenticatedRequest extends FastifyRequest {
    user?: {
        id: string;
        username: string;
    };
}
export declare function generateToken(user: {
    id: string;
    username: string;
}): string;
export declare function authenticate(request: AuthenticatedRequest, reply: FastifyReply): Promise<undefined>;
export declare function verifyToken(token: string): {
    id: string;
    username: string;
} | null;
//# sourceMappingURL=auth.d.ts.map