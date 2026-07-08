import { Request, Response } from 'express';
import { prisma } from '../index';
import { InvoiceStatus } from '@prisma/client';

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const { status, customer_id, page = '1', per_page = '20' } = req.query;
    
    const pageNumber = parseInt(page as string);
    const limit = parseInt(per_page as string);
    const skip = (pageNumber - 1) * limit;

    const whereClause: any = { deletedAt: null };
    if (status) whereClause.status = status as InvoiceStatus;
    if (customer_id) whereClause.customerId = customer_id as string;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { customer: true, trip: true }
      }),
      prisma.invoice.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: invoices,
      meta: {
        page: pageNumber,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch invoices' } });
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const { trip_id, customer_id, subtotal, total_amount, due_date } = req.body;

    if (!trip_id || !customer_id || !subtotal || !total_amount || !due_date) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required invoice fields' } });
    }

    const ref_id = 'INV-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900);

    const invoice = await prisma.invoice.create({
      data: {
        ref_id,
        tripId: trip_id,
        customerId: customer_id,
        subtotal: parseFloat(subtotal),
        total_amount: parseFloat(total_amount),
        due_date: new Date(due_date),
        status: InvoiceStatus.Draft,
        created_by: (req as any).user?.id
      }
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create invoice' } });
  }
};
