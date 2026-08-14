import express, { Request, Response } from 'express';
import path from 'path';
import { logger } from './utils/logger';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { env } from './config/env';

const app = express();
const httpServer = createServer(app);
// CORS origin is left open here (tightened for the HTTP API in Phase 3) —
// authentication below is what actually gates access to this socket server.
export const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH'] }
});

const port = env.PORT;
import { prisma } from './db';
export { prisma };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SocketUser {
  id?: string;
  driver_id?: string;
  role?: 'Admin' | 'Operator' | 'Driver';
}

import authRoutes from './routes/authRoutes';
import driverRoutes from './routes/driverRoutes';
import vehicleRoutes from './routes/vehicleRoutes';
import customerRoutes from './routes/customerRoutes';
import tripRoutes from './routes/tripRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import maintenanceRoutes from './routes/maintenanceRoutes';
import expenseRoutes from './routes/expenseRoutes';
import documentRoutes from './routes/documentRoutes';
import folderRoutes from './routes/folderRoutes';
import reportsRoutes from './routes/reportsRoutes';
import reportBuilderRoutes from './routes/reportBuilderRoutes';
import mobileAuthRoutes from './routes/mobileAuthRoutes';
import mobileTripRoutes from './routes/mobileTripRoutes';
import mobileNotificationRoutes from './routes/mobileNotificationRoutes';
import mobileProfileRoutes from './routes/mobileProfileRoutes';
import mobileEmergencyRoutes from './routes/mobileEmergencyRoutes';
import mobileMiscRoutes from './routes/mobileMiscRoutes';
import rateCardRoutes from './routes/rateCardRoutes';
import locationRoutes from './routes/locationRoutes';
import notificationRoutes from './routes/notificationRoutes';
import uploadRoutes from './routes/uploadRoutes';
import userRoutes from './routes/userRoutes';
import trashRoutes from './routes/trashRoutes';
import settingsRoutes from './routes/settingsRoutes';
import thirdPartyRoutes from './routes/thirdPartyRoutes';
import { initFleetTracking } from './services/icces/fleetPoller';
import { normalizeMobileLocationUpdate } from './services/tracking/locationUpdate';

import helmet from 'helmet';

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3060',
  process.env.VITE_APP_URL || 'https://dashboard.mercon.local'
];

app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true
}));

app.use(helmet());
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true
}));

// Default 100kb is too small for bulk-import bodies — a few hundred imported
// rate card / customer / driver / vehicle rows posted as JSON easily exceeds
// it and fails with "request entity too large" before the row-by-row import
// logic ever runs.
app.use(express.json({ limit: '250mb' }));
app.use(express.urlencoded({ limit: '250mb', extended: true }));
import { getUploadDir } from './middlewares/upload';
app.use('/uploads', express.static(getUploadDir()));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use('/uploads', express.static('/tmp/uploads'));

// Create API router and mount all API routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/drivers', driverRoutes);
apiRouter.use('/vehicles', vehicleRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/trips', tripRoutes);
apiRouter.use('/invoices', invoiceRoutes);
apiRouter.use('/maintenance', maintenanceRoutes);
apiRouter.use('/expenses', expenseRoutes);
apiRouter.use('/reports', reportsRoutes);
apiRouter.use('/report-builder', reportBuilderRoutes);
apiRouter.use('/documents', documentRoutes);
apiRouter.use('/folders', folderRoutes);
apiRouter.use('/rate-cards', rateCardRoutes);
apiRouter.use('/locations', locationRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/upload', uploadRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/trash', trashRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/third-party-providers', thirdPartyRoutes);

// Mount router on both /api and root for maximum proxy compatibility
app.use('/api', apiRouter);
app.use(apiRouter);

// Mobile API Routes
app.use('/mobile/auth', mobileAuthRoutes);
app.use('/mobile/trips', mobileTripRoutes);
app.use('/mobile/notifications', mobileNotificationRoutes);
app.use('/mobile/profile', mobileProfileRoutes);
app.use('/mobile/emergency', mobileEmergencyRoutes);
app.use('/mobile', mobileMiscRoutes); // /mobile/documents, /mobile/vehicle
app.use('/api/mobile', mobileMiscRoutes);

// Socket.io Telemetry WebSockets — every connection must present a valid JWT
// (same token used for the HTTP API) in the handshake, or it's rejected.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));

  jwt.verify(token, env.JWT_SECRET, (err: jwt.VerifyErrors | null, decoded: any) => {
    if (err || !decoded) return next(new Error('Invalid or expired token'));
    (socket.data as { user: SocketUser }).user = decoded as SocketUser;
    next();
  });
});

io.on('connection', (socket: Socket) => {
  const user = (socket.data as { user: SocketUser }).user;
  logger.info(`📡 WebSocket connected: ${socket.id} (${user.role ?? 'unknown'})`);

  // Auto-join a private room for this identity so server-sent notifications
  // (createNotification/createDriverNotification) can target them directly
  // instead of broadcasting to every connected client.
  if (user.role === 'Driver' && user.driver_id) {
    socket.join(`driver:${user.driver_id}`);
  } else if (user.id) {
    socket.join(`user:${user.id}`);
  }

  // A dashboard (Admin/Operator) or the assigned driver asks to watch a
  // specific trip's live location. Only the assigned driver or an
  // Admin/Operator may join — never an arbitrary authenticated client.
  socket.on('join:trip', async (tripId: unknown) => {
    if (typeof tripId !== 'string' || !UUID_RE.test(tripId)) return;

    if (user.role === 'Admin' || user.role === 'Operator') {
      socket.join(`trip:${tripId}`);
      return;
    }
    if (user.role === 'Driver' && user.driver_id) {
      const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { driverId: true } });
      if (trip?.driverId === user.driver_id) socket.join(`trip:${tripId}`);
    }
  });

  // Driver sends a GPS update. Only accepted from the driver actually
  // assigned to that trip, and relayed only to that trip's room — not to
  // every connected client.
  socket.on('driver:location_update', async (data) => {
    if (user.role !== 'Driver' || !user.driver_id) return;
    if (!data || typeof data.tripId !== 'string' || data.driverId !== user.driver_id) return;

    // Authorisation says who may speak; it says nothing about what they said.
    // This payload used to be relayed verbatim, so a malformed or hostile
    // client could put a non-numeric position on every watching operator's map.
    const update = normalizeMobileLocationUpdate(data);
    if (!update) return;

    const trip = await prisma.trip.findUnique({ where: { id: data.tripId }, select: { driverId: true } });
    if (trip?.driverId !== user.driver_id) return;

    io.to(`trip:${data.tripId}`).emit(`trip:location_update:${data.tripId}`, update);
  });

  socket.on('disconnect', () => {
    logger.info(`📡 WebSocket disconnected: ${socket.id}`);
  });
});

// Healthcheck endpoint
app.get(['/health', '/api/health'], (req: Request, res: Response) => {
  res.json({ success: true, message: 'MERCON API is running perfectly!' });
});

// Catches errors passed via next(err) — most notably multer's fileFilter
// rejections (invalid upload type). Must be registered after all routes.
// Without this, Express's default handler returns a raw HTML page with a
// full stack trace and a misleading 500 for what's really a 400-level
// client error.
app.use((err: Error, req: Request, res: Response, next: express.NextFunction) => {
  if (res.headersSent) return next(err);
  logger.error({ err }, 'Unhandled request error');
  res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message || 'Invalid request' } });
});

// Initialize Background Workers
initFleetTracking();

httpServer.listen(port, () => {
  logger.info(`🚀 MERCON API Server (with WebSockets) is running on port ${port}`);
});
