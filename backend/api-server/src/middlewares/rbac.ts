import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { prisma } from '../db';
import { getEnabledModules } from '../controllers/settingsController';

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated or role missing' } });
    }

    const isSuperAdminUser = req.user.role === 'SuperAdmin' || (req.user as any).isSuperAdmin === true;
    const isAllowed = allowedRoles.includes(req.user.role) || (isSuperAdminUser && (allowedRoles.includes('Admin') || allowedRoles.includes('SuperAdmin')));

    if (!isAllowed) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied: insufficient permissions' } });
    }

    next();
  };
};

// Re-reads isSuperAdmin / SuperAdmin role from the database on every request rather than trusting
// the JWT — revoking the flag must take effect immediately, not after the
// token's 7-day expiry.
export const requireSuperAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true, isSuperAdmin: true } });
    if (!user || (user.role !== 'SuperAdmin' && !user.isSuperAdmin)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Superadmin access required' } });
    }
    next();
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to verify superadmin status' } });
  }
};

// Gates an optional module's routes on this deployment's enabledModules list.
export const requireModuleEnabled = (moduleKey: string) => {
  return async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const enabled = await getEnabledModules();
      if (!enabled.has(moduleKey)) {
        return res.status(403).json({ success: false, error: { code: 'MODULE_DISABLED', message: `The "${moduleKey}" module is not enabled on this deployment` } });
      }
      next();
    } catch (error) {
      return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to verify module status' } });
    }
  };
};
