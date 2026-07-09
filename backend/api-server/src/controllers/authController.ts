import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from '../index';

/* ─── Unified Login (username + password) ──────────────────────────────────── */
export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Username and password are required' }
    });
  }

  try {
    const user = await prisma.user.findUnique({ 
      where: { username },
      include: { driver: true } 
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' }
      });
    }

    const passwordHash: string = (user as any).password_hash || '';
    const isValid = passwordHash ? await bcrypt.compare(password, passwordHash) : false;

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' }
      });
    }

    const jwtPayload = { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      driver_id: user.driver?.id 
    };
    
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET as string, { expiresIn: '7d' });

    return res.json({
      success: true,
      data: {
        token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          name: user.name,
          driver: user.driver ? {
            id: user.driver.id,
            first_name: user.driver.first_name,
            last_name: user.driver.last_name
          } : null
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

/* ─── Get current profile ───────────────────────────────────────── */
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: { driver: true }
    });
    
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    
    return res.json({ 
      success: true, 
      data: { 
        id: user.id, 
        username: user.username, 
        name: user.name, 
        role: user.role,
        driver: user.driver ? {
          id: user.driver.id,
          first_name: user.driver.first_name,
          last_name: user.driver.last_name
        } : null
      } 
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};
