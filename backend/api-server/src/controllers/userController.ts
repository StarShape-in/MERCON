import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { prisma } from '../index';
import bcrypt from 'bcrypt';

// Get all users (except drivers if we only want dashboard users, but let's just return all non-drivers for now, or all)
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: 'Driver' } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        username: true,
        role: true,
        isActive: true,
        isSuperAdmin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Map to frontend expected format
    const formattedUsers = users.map(u => ({
      ...u,
      status: u.isActive ? 'Active' : 'Inactive',
      lastLogin: u.createdAt.toISOString(), // Placeholder since lastLogin is missing
    }));

    res.json({ success: true, data: formattedUsers });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching users:');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

// Create a new user
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, role, password, username, status } = req.body;
    
    if (!name || (!phone && !email) || !role || !password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields (Name, Phone/Email, Role, Password)' } });
    }

    const cleanPhone = phone ? String(phone).trim() : null;
    const cleanEmail = email ? String(email).trim() : null;
    const cleanUsername = username ? String(username).trim() : (cleanPhone || cleanEmail || name.toLowerCase().replace(/\s+/g, ''));

    const orConditions: any[] = [];
    if (cleanUsername) orConditions.push({ username: cleanUsername });
    if (cleanPhone) orConditions.push({ phone: cleanPhone });
    if (cleanEmail) orConditions.push({ email: cleanEmail });

    if (orConditions.length > 0) {
      const existingUser = await prisma.user.findFirst({
        where: { OR: orConditions }
      });

      if (existingUser) {
        if (existingUser.username === cleanUsername) {
          return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'User with this username already exists' } });
        }
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'User with this phone number or email already exists' } });
      }
    }

    const password_hash = await bcrypt.hash(password, 10);
    const isActive = status ? status === 'Active' : true;

    const newUser = await prisma.user.create({
      data: {
        name,
        phone: cleanPhone,
        email: cleanEmail,
        username: cleanUsername,
        role,
        password_hash,
        isActive
      }
    });

    res.json({
      success: true,
      data: { id: newUser.id, name: newUser.name, username: newUser.username, phone: newUser.phone, email: newUser.email, role: newUser.role, status: newUser.isActive ? 'Active' : 'Inactive', isSuperAdmin: newUser.isSuperAdmin }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error creating user:');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

// Update an existing user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, username, phone, email, role, status, password, isSuperAdmin } = req.body;

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;
    if (username) dataToUpdate.username = String(username).trim();
    if (phone !== undefined) {
      const cleanPhone = phone ? String(phone).trim() : null;
      dataToUpdate.phone = cleanPhone;
    }
    if (email !== undefined) {
      dataToUpdate.email = email ? String(email).trim() : null;
    }
    if (role) dataToUpdate.role = role;
    if (status) dataToUpdate.isActive = status === 'Active';
    if (password) {
      dataToUpdate.password_hash = await bcrypt.hash(password, 10);
    }

    // isSuperAdmin is a platform-level flag, not a Role — the route only
    // requires Admin, so plain Admins could otherwise self-escalate by
    // editing their own account. Field-level check instead of a route-level
    // one so the rest of this endpoint (name/role/status/password) stays
    // usable by any Admin.
    if (isSuperAdmin !== undefined) {
      const requesterId = (req as any).user?.id;
      const requester = await prisma.user.findUnique({ where: { id: requesterId }, select: { isSuperAdmin: true } });
      if (!requester?.isSuperAdmin) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only a superadmin can grant or revoke superadmin access' } });
      }

      if (isSuperAdmin === false) {
        const target = await prisma.user.findUnique({ where: { id: id as string }, select: { isSuperAdmin: true } });
        if (target?.isSuperAdmin) {
          const remaining = await prisma.user.count({ where: { isSuperAdmin: true, id: { not: id as string } } });
          if (remaining === 0) {
            return res.status(409).json({ success: false, error: { code: 'LAST_SUPERADMIN', message: 'Cannot revoke the last superadmin — grant it to someone else first' } });
          }
        }
      }

      dataToUpdate.isSuperAdmin = isSuperAdmin;
    }

    const updatedUser = await prisma.user.update({
      where: { id: id as string },
      data: dataToUpdate
    });

    res.json({
      success: true,
      data: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, status: updatedUser.isActive ? 'Active' : 'Inactive', isSuperAdmin: updatedUser.isSuperAdmin }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error updating user:');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

// Delete (Hard delete or soft delete) a user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if it's the current user trying to delete themselves
    if ((req as any).user?.id === id) {
       return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot delete your own account' } });
    }

    // Soft delete (deactivate) for safety
    await prisma.user.update({
      where: { id: id as string },
      data: { isActive: false, deletedAt: new Date() }
    });

    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting user:');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};
