/**
 * Authentication middleware using CF-Better-Auth adapter
 */

import { Request, Response, NextFunction } from 'express';
import { auth, authAdapter } from '../lib/auth';

// Extend Express Request type to include user and session
declare global {
  namespace Express {
    interface Request {
      user?: any;
      session?: any;
    }
  }
}

/**
 * Middleware to check if user is authenticated
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Convert Express request to Fetch API Request
    const fetchRequest = new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
      method: req.method,
      headers: req.headers as any,
      body: req.body ? JSON.stringify(req.body) : undefined,
    });

    // Get session using the auth adapter
    const session = await auth.api.getSession({ 
      headers: fetchRequest.headers 
    });

    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Please sign in to continue'
      });
    }

    // Attach user and session to request
    req.user = session.user;
    req.session = session;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'Failed to verify authentication'
    });
  }
}

/**
 * Middleware to optionally load user if authenticated
 */
export async function loadUser(req: Request, res: Response, next: NextFunction) {
  try {
    // Convert Express request to Fetch API Request
    const fetchRequest = new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
      method: req.method,
      headers: req.headers as any,
      body: req.body ? JSON.stringify(req.body) : undefined,
    });

    // Try to get session
    const session = await auth.api.getSession({ 
      headers: fetchRequest.headers 
    });

    if (session) {
      req.user = session.user;
      req.session = session;
    }

    next();
  } catch (error) {
    // Silently continue if session loading fails
    console.debug('Optional auth loading failed:', error);
    next();
  }
}

/**
 * Middleware to check if user has required role
 */
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // First ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Please sign in to continue'
      });
    }

    // Check if user has required role
    const userRole = req.user.role || 'user';
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
}

/**
 * Middleware to check if user owns the resource
 */
export function requireOwnership(resourceUserIdField: string = 'userId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    // First ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Please sign in to continue'
      });
    }

    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (resourceUserId && resourceUserId !== req.user.id) {
      // Allow admins to access any resource
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource'
        });
      }
    }

    next();
  };
}

/**
 * Middleware to check if user is in organization
 */
export function requireOrganization(orgIdField: string = 'organizationId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    // First ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Please sign in to continue'
      });
    }

    const organizationId = req.params[orgIdField] || req.body[orgIdField];
    
    if (!organizationId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Organization ID is required'
      });
    }

    // Check if user is member of organization
    // This would typically involve a database query
    // For now, we'll assume the user's organizations are in the session
    if (!req.session?.organizations?.includes(organizationId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this organization'
      });
    }

    next();
  };
}

/**
 * Rate limiting middleware using the adapter
 */
export async function rateLimit(windowMs: number = 60000, max: number = 100) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Get or create rate limit entry
    let entry = requests.get(ip);
    
    if (!entry || entry.resetTime < now) {
      entry = { count: 0, resetTime: now + windowMs };
      requests.set(ip, entry);
    }

    entry.count++;

    // Check if limit exceeded
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter
      });
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', (max - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    next();
  };
}

/**
 * CSRF protection middleware
 */
export async function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Check CSRF token
  const token = req.headers['x-csrf-token'] || req.body?._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || token !== sessionToken) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid CSRF token'
    });
  }

  next();
}

/**
 * Audit logging middleware
 */
export async function auditLog(action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Log request
    const logEntry = {
      action,
      userId: req.user?.id,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.path,
      timestamp: new Date(),
    };

    // Continue with request
    const originalSend = res.send;
    res.send = function(data) {
      // Log response
      const duration = Date.now() - startTime;
      console.log('[AUDIT]', {
        ...logEntry,
        statusCode: res.statusCode,
        duration,
      });

      // Call original send
      return originalSend.call(this, data);
    };

    next();
  };
}