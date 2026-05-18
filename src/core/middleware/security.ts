import { Request, Response, NextFunction } from 'express';

export const securityMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // CSP: Allow WebSocket connections and inline scripts/styles as needed
    // Matches root security middleware
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' data:; img-src 'self' data: blob:; connect-src 'self' ws: wss: http: https:;"
    );
    next();
};
