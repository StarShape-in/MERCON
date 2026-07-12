import { Request, Response } from 'express';
import { env } from '../config/env';
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
    
    const token = jwt.sign(jwtPayload, env.JWT_SECRET, { expiresIn: '7d' });

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
        email: user.email,
        phone: user.phone,
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

/* ─── Update own profile (name / email / phone) ─────────────────────────────── */
export const updateMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { name, email, phone } = req.body;

    const data: { name?: string; email?: string | null; phone?: string | null } = {};
    if (name !== undefined) data.name = String(name).trim();
    if (email !== undefined) data.email = email ? String(email).trim() : null;
    if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;

    const user = await prisma.user.update({ where: { id: userId }, data });

    return res.json({
      success: true,
      data: { id: user.id, username: user.username, name: user.name, email: user.email, phone: user.phone, role: user.role }
    });
  } catch (error: any) {
    // Unique constraint (email/phone already taken)
    if (error?.code === 'P2002') {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'That email or phone is already in use' } });
    }
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update profile' } });
  }
};

/* ─── Change own password (knows current password) ──────────────────────────── */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Current and new password are required' } });
    }
    if (String(new_password).length < 8) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 8 characters' } });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });

    const ok = user.password_hash ? await bcrypt.compare(current_password, user.password_hash) : false;
    if (!ok) return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' } });

    const hash = await bcrypt.hash(new_password, 10);
    await prisma.user.update({ where: { id: userId }, data: { password_hash: hash } });

    return res.json({ success: true, data: { message: 'Password updated' } });
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to change password' } });
  }
};

/**
 * Sign a single-use, stateless password-reset token.
 * Secret = JWT_SECRET + current password hash → once the password changes the
 * token stops verifying, so it can only be used once and needs no DB table.
 */
function resetTokenSecret(passwordHash: string | null): string {
  return env.JWT_SECRET + (passwordHash || '');
}

/* ─── Forgot password: issue a reset link (email transport still TODO) ───────── */
export const forgotPassword = async (req: Request, res: Response) => {
  const genericResponse = () =>
    res.json({ success: true, data: { message: 'If that email exists, a reset link has been sent.' } });
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email is required' } });

    const user = await prisma.user.findUnique({ where: { email: String(email).trim() } });
    // Never reveal whether the email exists.
    if (!user || !user.isActive) return genericResponse();

    const token = jwt.sign({ id: user.id, purpose: 'password_reset' }, resetTokenSecret(user.password_hash), { expiresIn: '15m' });
    const link = `${env.WEB_ORIGIN || 'https://mercon.tech'}/reset-password?token=${token}`;

    // TODO: send `link` via email (SendGrid/SES). No email provider is wired yet,
    // so we log it server-side for now — an admin can deliver it manually.
    console.log(`[PASSWORD RESET] for ${user.username} <${email}>: ${link}`);

    return genericResponse();
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to process request' } });
  }
};

/* ─── Reset password using a token from forgotPassword ──────────────────────── */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Token and new password are required' } });
    }
    if (String(new_password).length < 8) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 8 characters' } });
    }

    // Read the user id from the (unverified) token so we can look up the signing secret.
    const decoded = jwt.decode(token) as { id?: string } | null;
    if (!decoded?.id) return res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset link' } });

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset link' } });

    try {
      const payload = jwt.verify(token, resetTokenSecret(user.password_hash)) as { purpose?: string };
      if (payload.purpose !== 'password_reset') throw new Error('wrong purpose');
    } catch {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset link' } });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password_hash: hash } });

    return res.json({ success: true, data: { message: 'Password has been reset' } });
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to reset password' } });
  }
};
