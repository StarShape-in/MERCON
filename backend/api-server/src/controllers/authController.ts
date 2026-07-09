import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from '../index';

// In-memory store for OTPs (For production, consider Redis or a DB table)
const otpStore = new Map<string, { otp: string, expiresAt: number }>();

export const requestOtp = async (req: Request, res: Response) => {
  const { phone } = req.body;

  if (!phone || !phone.match(/^(?:\+9665|05)\d{8}$/)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Phone number is invalid',
        fields: { phone: 'Must be a valid Saudi mobile number (+9665XXXXXXXX or 05XXXXXXXX)' }
      }
    });
  }

  // Generate a 6-digit OTP
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set expiration (5 minutes)
  const expiresAt = Date.now() + 5 * 60 * 1000;
  
  otpStore.set(phone, { otp: generatedOtp, expiresAt });

  // In a real app, you would integrate an SMS provider (e.g., Twilio, Unifonic) here
  console.log(`[Dev Only] Generated OTP for ${phone}: ${generatedOtp}`);

  res.json({
    success: true,
    data: {
      phone: phone,
      expires_in: 300,
      resend_after: 30
    }
  });
};

/* ─── Operator Login (email + password) ──────────────────────────────────── */
export const operatorLogin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' }
    });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    // password_hash field – if not yet present, we check a placeholder for now
    const passwordHash: string = (user as any).password_hash || '';
    const isValid = passwordHash ? await bcrypt.compare(password, passwordHash) : false;

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    const jwtPayload = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET as string, { expiresIn: '7d' });

    return res.json({
      success: true,
      data: {
        token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        user: { id: user.id, email: user.email, phone: user.phone, role: user.role }
      }
    });
  } catch (error) {
    console.error('Operator login error:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

/* ─── Get current operator profile ───────────────────────────────────────── */
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const role   = (req as any).user?.role;

    if (role === 'driver') {
      // JWT came from driver OTP flow
      const driver = await prisma.driver.findUnique({ where: { id: userId } });
      if (!driver) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Driver not found' } });
      return res.json({ success: true, data: { id: driver.id, name: `${driver.first_name} ${driver.last_name}`, phone: driver.phone_primary, role: 'driver' } });
    }

    // Operator / Admin JWT
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    return res.json({ success: true, data: { id: user.id, email: user.email, phone: user.phone, role: user.role } });
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  const { phone, otp } = req.body;

  if (!phone || !otp || otp.length !== 6) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid phone or OTP format' }
    });
  }

  const storedData = otpStore.get(phone);

  if (!storedData) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_OTP', message: 'OTP not found or expired' } });
  }

  if (Date.now() > storedData.expiresAt) {
    otpStore.delete(phone);
    return res.status(400).json({ success: false, error: { code: 'OTP_EXPIRED', message: 'OTP has expired' } });
  }

  if (storedData.otp !== otp) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_OTP', message: 'Incorrect OTP' } });
  }

  // OTP is valid. Clear it.
  otpStore.delete(phone);

  try {
    // Check if driver exists, if not, create a basic record (or reject depending on business rules)
    // For this implementation, we assume any verified phone belongs to a Driver if they login via this app.
    // Realistically you'd want to check if they are a User or Driver. We'll check Driver first.
    let driver = await prisma.driver.findUnique({ where: { phone_primary: phone } });
    
    if (!driver) {
      // Auto-create a temporary driver profile for demonstration. 
      // In production, an admin might need to pre-register drivers.
      driver = await prisma.driver.create({
        data: {
          // UUID is auto-generated by the database default
          ref_id: 'DRV-' + Math.floor(1000 + Math.random() * 9000).toString(),
          phone_primary: phone,
          first_name: 'New',
          last_name: 'Driver',
          license_number: 'PENDING',
          license_expiry: new Date(Date.now() + 31536000000) // 1 year from now
        }
      });
    }

    // Generate JWT
    const jwtPayload = {
      id: driver.id,
      phone: driver.phone_primary,
      role: 'driver'
    };

    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET as string, { expiresIn: '7d' });

    res.json({
      success: true,
      data: {
        token: token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
          id: driver.id,
          first_name: driver.first_name,
          last_name: driver.last_name,
          phone: driver.phone_primary,
          role: 'driver',
          driver_id: driver.id
        }
      }
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};
