import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { logger } from '../utils/logger';
import { setRequestUserId } from './requestContext';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateJWT = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, env.JWT_SECRET, async (err: any, decoded: any) => {
      if (err || !decoded?.id) {
        return res.status(401).json({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Invalid or expired token' } });
      }

      try {
        const freshUser = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, role: true, isActive: true, isSuperAdmin: true, name: true, email: true, username: true }
        });

        if (!freshUser || !freshUser.isActive) {
          return res.status(401).json({ success: false, error: { code: 'ACCOUNT_INACTIVE', message: 'Account is inactive or has been deactivated' } });
        }

        req.user = freshUser;
        setRequestUserId(freshUser.id);
        next();
      } catch (dbErr) {
        logger.error({ err: dbErr }, 'Error verifying user status in auth middleware:');
        return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
      }
    });
  } else {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authorization token missing' } });
  }
};

