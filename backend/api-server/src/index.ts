import express, { Request, Response } from 'express';
import { logger } from './utils/logger';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { env } from './config/env';

const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH'] }
});

const port = env.PORT;
export const prisma = new PrismaClient();

import authRoutes from './routes/authRoutes';
import driverRoutes from './routes/driverRoutes';
import vehicleRoutes from './routes/vehicleRoutes';
import customerRoutes from './routes/customerRoutes';
import tripRoutes from './routes/tripRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import maintenanceRoutes from './routes/maintenanceRoutes';
import documentRoutes from './routes/documentRoutes';
import reportsRoutes from './routes/reportsRoutes';
import trackingRoutes from './routes/trackingRoutes';
import mobileAuthRoutes from './routes/mobileAuthRoutes';
import mobileTripRoutes from './routes/mobileTripRoutes';
import mobileNotificationRoutes from './routes/mobileNotificationRoutes';
import mobileProfileRoutes from './routes/mobileProfileRoutes';
import mobileEmergencyRoutes from './routes/mobileEmergencyRoutes';
import mobileMiscRoutes from './routes/mobileMiscRoutes';
import rateCardRoutes from './routes/rateCardRoutes';
import notificationRoutes from './routes/notificationRoutes';
import uploadRoutes from './routes/uploadRoutes';
import userRoutes from './routes/userRoutes';
import { initCronJobs } from './services/cronJobs';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files statically

// Routes
app.use('/auth', authRoutes);
app.use('/drivers', driverRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/customers', customerRoutes);
app.use('/trips', tripRoutes);
app.use('/invoices', invoiceRoutes);
app.use('/maintenance', maintenanceRoutes);
app.use('/reports', reportsRoutes);
app.use('/tracking', trackingRoutes);
app.use('/documents', documentRoutes);
app.use('/rate-cards', rateCardRoutes);
app.use('/notifications', notificationRoutes);
app.use('/upload', uploadRoutes);
app.use('/users', userRoutes);

// Mobile API Routes
app.use('/mobile/auth', mobileAuthRoutes);
app.use('/mobile/trips', mobileTripRoutes);
app.use('/mobile/notifications', mobileNotificationRoutes);
app.use('/mobile/profile', mobileProfileRoutes);
app.use('/mobile/emergency', mobileEmergencyRoutes);
app.use('/mobile', mobileMiscRoutes); // /mobile/documents, /mobile/vehicle

// Socket.io Telemetry WebSockets
io.on('connection', (socket) => {
  logger.info(`📡 WebSocket connected: ${socket.id}`);

  // Driver sends GPS update
  socket.on('driver:location_update', (data) => {
    // data: { tripId: string, driverId: string, lat: number, lng: number, speed: number }
    // Broadcast to tracking dashboards
    io.emit(`trip:location_update:${data.tripId}`, data);
  });

  socket.on('disconnect', () => {
    logger.info(`📡 WebSocket disconnected: ${socket.id}`);
  });
});

// Healthcheck endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ success: true, message: 'MERCON API is running perfectly!' });
});

// Initialize Background Workers
initCronJobs();

httpServer.listen(port, () => {
  logger.info(`🚀 MERCON API Server (with WebSockets) is running on port ${port}`);
});
