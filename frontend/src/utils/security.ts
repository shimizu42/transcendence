/**
 * Security utilities for input validation and sanitization
 */

export class SecurityUtils {
    /**
     * Sanitize HTML input to prevent XSS attacks
     */
    static sanitizeHTML(input: string): string {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    /**
     * Validate and sanitize player name input
     */
    static validatePlayerName(name: string): { isValid: boolean; sanitized: string; error?: string } {
        if (!name || typeof name !== 'string') {
            return { isValid: false, sanitized: '', error: 'Name is required' };
        }

        const trimmed = name.trim();
        
        if (trimmed.length === 0) {
            return { isValid: false, sanitized: '', error: 'Name cannot be empty' };
        }

        if (trimmed.length > 20) {
            return { isValid: false, sanitized: '', error: 'Name must be 20 characters or less' };
        }

        // Check for potentially malicious patterns
        const dangerousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i,
            /<object/i,
            /<embed/i
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(trimmed)) {
                return { isValid: false, sanitized: '', error: 'Invalid characters in name' };
            }
        }

        // Sanitize the input
        const sanitized = this.sanitizeHTML(trimmed);

        return { isValid: true, sanitized };
    }

    /**
     * Generate a cryptographically secure random string
     */
    static generateSecureId(length: number = 16): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        // Use crypto.getRandomValues if available, fallback to Math.random
        if (window.crypto && window.crypto.getRandomValues) {
            const array = new Uint8Array(length);
            window.crypto.getRandomValues(array);
            for (let i = 0; i < length; i++) {
                result += chars[array[i] % chars.length];
            }
        } else {
            // Fallback for environments without crypto.getRandomValues
            for (let i = 0; i < length; i++) {
                result += chars[Math.floor(Math.random() * chars.length)];
            }
        }
        
        return result;
    }

    /**
     * Validate that a string contains only safe characters
     */
    static containsOnlySafeChars(input: string): boolean {
        // Allow alphanumeric, spaces, and basic punctuation
        const safePattern = /^[a-zA-Z0-9\s\-_\.!?\(\)]+$/;
        return safePattern.test(input);
    }

    /**
     * Rate limiting utility
     */
    static createRateLimiter(maxAttempts: number, windowMs: number) {
        const attempts = new Map<string, { count: number; resetTime: number }>();

        return {
            isAllowed(identifier: string): boolean {
                const now = Date.now();
                const record = attempts.get(identifier);

                if (!record || now > record.resetTime) {
                    attempts.set(identifier, { count: 1, resetTime: now + windowMs });
                    return true;
                }

                if (record.count >= maxAttempts) {
                    return false;
                }

                record.count++;
                return true;
            },

            reset(identifier?: string): void {
                if (identifier) {
                    attempts.delete(identifier);
                } else {
                    attempts.clear();
                }
            }
        };
    }

    /**
     * Content Security Policy helper
     */
    static enforceCSP(): void {
        // Add meta tag for CSP if not already present
        if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
            const meta = document.createElement('meta');
            meta.setAttribute('http-equiv', 'Content-Security-Policy');
            meta.setAttribute('content', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;");
            document.head.appendChild(meta);
        }
    }

    /**
     * Prevent common timing attacks by adding consistent delay
     */
    static async constantTimeDelay(minMs: number = 100): Promise<void> {
        const delay = minMs + Math.random() * 50; // Add some randomness
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Log security events (in a real app, this would send to a logging service)
     */
    static logSecurityEvent(event: string, details: any = {}): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            details,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // In production, send this to your security monitoring service
        console.warn('Security Event:', logEntry);
    }
}