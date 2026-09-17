import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { prisma } from '../db';
import { getEnabledModules } from '../controllers/settingsController';
import { hasPermission } from '../config/permissions';

/**
 * Express middleware to enforce granular permissions (e.g. 'quotations.edit', 'users.manage').
 * SuperAdmin role automatically bypasses specific permission checks.
 */
export const requirePermission = (permissionKey: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated or role missing' },
      });
    }

    const isSuperAdminUser =
      req.user.role === 'SuperAdmin' ||
      String(req.user.role).toLowerCase() === 'super_admin' ||
      (req.user as any).isSuperAdmin === true;

    if (isSuperAdminUser || hasPermission(req.user.role, permissionKey)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: `Access denied: permission "${permissionKey}" required`,
      },
    });
  };
};

/**
 * Backward-compatible role check middleware.
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated or role missing' } });
    }

    const roleLower = String(req.user.role || '').toLowerCase();
    const isSuperAdminUser = roleLower === 'superadmin' || roleLower === 'super_admin' || (req.user as any).isSuperAdmin === true;
    const allowedLower = allowedRoles.map((r) => r.toLowerCase());

    const isAllowed = allowedLower.includes(roleLower) || (isSuperAdminUser && (allowedLower.includes('admin') || allowedLower.includes('superadmin')));

    if (!isAllowed) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied: insufficient permissions' } });
    }

    next();
  };
};

/**
 * Re-reads isSuperAdmin / SuperAdmin role from the database on every request rather than trusting
 * the JWT — revoking the flag must take effect immediately.
 */
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

/**
 * Gates an optional module's routes on this deployment's enabledModules list.
 */
export const requireModuleEnabled = (moduleKey: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const roleLower = (req.user?.role || '').toLowerCase();
      const isSuperAdminUser = roleLower === 'superadmin' || roleLower === 'super_admin' || (req.user as any)?.isSuperAdmin === true;
      if (isSuperAdminUser) {
        return next();
      }

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
