import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
export const prisma = new PrismaClient();

import authRoutes from './routes/authRoutes';
import driverRoutes from './routes/driverRoutes';
import vehicleRoutes from './routes/vehicleRoutes';
import customerRoutes from './routes/customerRoutes';
import tripRoutes from './routes/tripRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import maintenanceRoutes from './routes/maintenanceRoutes';

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

// Healthcheck endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ success: true, message: 'MERCON API is running perfectly!' });
});

app.listen(port, () => {
  console.log(`🚀 MERCON API Server is running on port ${port}`);
});
