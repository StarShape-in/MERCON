import { Request, Response } from 'express';
import { prisma } from '../db';
import { generateRefId } from '../utils/refId';
import { buildSearchAnd } from '../utils/search';
import { InvoiceStatus, TripStatus } from '@prisma/client';

const isUuid = (val: any): boolean =>
  typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

const INVOICE_SEARCH_FIELDS = [
  'ref_id',
  'customer.name',
  'customer.contact_phone',
  'trip.ref_id',
];

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const { status, customer_id, search, page = '1', per_page = '20' } = req.query;

    const pageNumber = parseInt(page as string);
    const limit = parseInt(per_page as string);
    const skip = (pageNumber - 1) * limit;

    const whereClause: any = { deletedAt: null };
    if (status) whereClause.status = status as InvoiceStatus;
    if (customer_id) whereClause.customerId = customer_id as string;
    const searchAnd = buildSearchAnd(search, INVOICE_SEARCH_FIELDS);
    if (searchAnd.length > 0) whereClause.AND = searchAnd;

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
    const userId = (req as any).user?.id;

    const ref_id = await generateRefId('INV', () =>
      prisma.invoice.findMany({ select: { ref_id: true } }));

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          ref_id,
          tripId: trip_id,
          customerId: customer_id,
          subtotal,
          total_amount,
          due_date,
          status: InvoiceStatus.Draft,
          created_by: userId
        }
      });

      if (trip_id) {
        await tx.trip.update({
          where: { id: trip_id },
          data: {
            status: TripStatus.Invoiced,
            updated_by: userId
          }
        });
      }

      return inv;
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create invoice' } });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id as string, deletedAt: null },
      include: {
        customer: true,
        trip: {
          include: {
            driver: { select: { id: true, first_name: true, last_name: true } },
            vehicle: { select: { id: true, plate_number: true, asset_type: true } },
            stops: { orderBy: { stop_sequence: 'asc' }, include: { location: true } },
          }
        }
      }
    });
    if (!invoice) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    }
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch invoice' } });
  }
};

export const updateInvoiceStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    const allowedStatuses = Object.values(InvoiceStatus);
    if (!status || !allowedStatuses.includes(status as InvoiceStatus)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `Status must be one of: ${allowedStatuses.join(', ')}` }
      });
    }

    const updated = await prisma.invoice.update({
      where: { id: req.params.id as string },
      data: {
        status: status as InvoiceStatus,
        updated_by: (req as any).user?.id
      },
      include: { customer: true, trip: true }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update invoice status' } });
  }
};

export const bulkDeleteInvoices = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No IDs provided' } });
    }

    await prisma.invoice.updateMany({
      where: { id: { in: ids } },
      data: {
        deletedAt: new Date(),
        isActive: false,
        deleted_by: userId
      }
    });
    res.json({ success: true, data: { message: `Successfully deleted ${ids.length} invoices` } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: `Failed to bulk delete invoices` } });
  }
};

export const bulkUpdateInvoiceStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'IDs and status are required' } });
    }

    await prisma.invoice.updateMany({
      where: { id: { in: ids } },
      data: {
        status: status as InvoiceStatus,
        updated_by: userId
      }
    });
    res.json({ success: true, data: { message: `Successfully updated ${ids.length} invoices` } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: `Failed to bulk update invoices` } });
  }
};

/**
 * Mark a completed trip as invoiced.
 *
 * This is the ONLY place an Invoice record is created in the new workflow.
 * The operator calls this endpoint after they have processed the invoice
 * externally (in their accounting/ZATCA system). MERCON stores the external
 * reference for tracking purposes only.
 *
 * POST /trips/:id/mark-invoiced
 * Body: { zatca_ref?: string; invoicing_note?: string }
 */
export const markTripInvoiced = async (req: Request, res: Response) => {
  try {
    const rawTripId = req.params.id as string;
    let tripId = rawTripId;
    if (!isUuid(rawTripId)) {
      const resolved = await prisma.trip.findFirst({
        where: {
          OR: [
            { ref_id: rawTripId },
            { ref_id: { equals: rawTripId, mode: 'insensitive' } },
          ],
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!resolved) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
      }
      tripId = resolved.id;
    }
    const userId = (req as any).user?.id;
    const { zatca_ref, invoicing_note } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: tripId, deletedAt: null },
        include: { customer: true }
      });

      if (!trip) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
      if (trip.status !== TripStatus.Completed) throw Object.assign(new Error('TRIP_NOT_COMPLETED'), { status: 409 });

      // Duplicate protection: one active invoice per trip
      const existing = await tx.invoice.findFirst({
        where: { tripId: trip.id, deletedAt: null }
      });
      if (existing) throw Object.assign(new Error('ALREADY_INVOICED'), { status: 409 });

      const baseBilling = trip.billing_amount ?? trip.trip_charges ?? 0;
      const totalAmount =
        baseBilling +
        (trip.waiting_labor_charges ?? 0) +
        (trip.additional_stop_charges ?? 0);

      const invoiceRefId = await generateRefId('INV', () =>
        tx.invoice.findMany({ select: { ref_id: true } })
      );

      const invoice = await tx.invoice.create({
        data: {
          ref_id: invoiceRefId,
          tripId: trip.id,
          customerId: trip.customerId,
          // Paid: the real invoice has already been processed externally by the time the operator marks it here
          status: InvoiceStatus.Paid,
          currency: 'SAR',
          subtotal: baseBilling,
          total_amount: totalAmount,
          due_date: new Date(),
          zatca_ref: zatca_ref ? String(zatca_ref).trim() || null : null,
          invoicing_note: invoicing_note ? String(invoicing_note).trim() || null : null,
          created_by: userId ?? undefined,
        }
      });

      const updatedTrip = await tx.trip.update({
        where: { id: trip.id },
        data: { status: TripStatus.Invoiced, updated_by: userId ?? undefined },
        include: {
          customer: true,
          driver: { select: { id: true, first_name: true, last_name: true } },
          vehicle: { select: { id: true, plate_number: true } },
          stops: { orderBy: { stop_sequence: 'asc' }, include: { location: true } },
          invoices: { where: { deletedAt: null } },
        }
      });

      return { trip: updatedTrip, invoice };
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    if (err.message === 'TRIP_NOT_COMPLETED') return res.status(409).json({ success: false, error: { code: 'TRIP_NOT_COMPLETED', message: 'Only completed trips can be marked as invoiced' } });
    if (err.message === 'ALREADY_INVOICED') return res.status(409).json({ success: false, error: { code: 'ALREADY_INVOICED', message: 'This trip already has an invoice record' } });
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to mark trip as invoiced' } });
  }
};

/**
 * Unmark a trip as invoiced — reverses markTripInvoiced.
 * Soft-deletes the Invoice record and resets the trip to Completed.
 *
 * POST /trips/:id/unmark-invoiced
 */
export const unmarkTripInvoiced = async (req: Request, res: Response) => {
  try {
    const rawTripId = req.params.id as string;
    let tripId = rawTripId;
    if (!isUuid(rawTripId)) {
      const resolved = await prisma.trip.findFirst({
        where: {
          OR: [
            { ref_id: rawTripId },
            { ref_id: { equals: rawTripId, mode: 'insensitive' } },
          ],
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!resolved) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
      }
      tripId = resolved.id;
    }
    const userId = (req as any).user?.id;

    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId, deletedAt: null } });
      if (!trip) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
      if (trip.status !== TripStatus.Invoiced) throw Object.assign(new Error('TRIP_NOT_INVOICED'), { status: 409 });

      const existingInvoice = await tx.invoice.findFirst({ where: { tripId: trip.id, deletedAt: null } });
      if (existingInvoice) {
        await tx.invoice.update({
          where: { id: existingInvoice.id },
          data: { deletedAt: new Date(), isActive: false, deleted_by: userId ?? undefined }
        });
      }

      return tx.trip.update({
        where: { id: trip.id },
        data: { status: TripStatus.Completed, updated_by: userId ?? undefined }
      });
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    if (err.message === 'TRIP_NOT_INVOICED') return res.status(409).json({ success: false, error: { code: 'TRIP_NOT_INVOICED', message: 'This trip is not currently in Invoiced state' } });
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to unmark trip invoiced status' } });
  }
};

/**
 * GET /invoices/billing-ledger
 * Returns trips in Completed or Invoiced state for the invoicing ledger.
 * Supports filtering by customer, date range, invoice_status, and search.
 */
export const getBillingLedger = async (req: Request, res: Response) => {
  try {
    const {
      customer_id,
      date_from,
      date_to,
      invoice_status,  // 'NotInvoiced' | 'Invoiced' | undefined (all)
      search,
      page = '1',
      per_page = '20',
    } = req.query;

    const pageNumber = parseInt(page as string);
    const limit = parseInt(per_page as string);
    const skip = (pageNumber - 1) * limit;

    let statusFilter: TripStatus[];
    if (invoice_status === 'NotInvoiced') {
      statusFilter = [TripStatus.Completed];
    } else if (invoice_status === 'Invoiced') {
      statusFilter = [TripStatus.Invoiced];
    } else {
      statusFilter = [TripStatus.Completed, TripStatus.Invoiced];
    }

    const andConditions: any[] = [];

    if (date_from) {
      const from = new Date(date_from as string);
      from.setHours(0, 0, 0, 0);
      andConditions.push({
        OR: [
          { planned_start: { gte: from } },
          { AND: [{ planned_start: null }, { createdAt: { gte: from } }] }
        ]
      });
    }
    if (date_to) {
      const to = new Date(date_to as string);
      to.setHours(23, 59, 59, 999);
      andConditions.push({
        OR: [
          { planned_start: { lte: to } },
          { AND: [{ planned_start: null }, { createdAt: { lte: to } }] }
        ]
      });
    }
    if (search && String(search).trim()) {
      const q = String(search).trim();
      andConditions.push({
        OR: [
          { ref_id: { contains: q, mode: 'insensitive' } },
          { customer: { name: { contains: q, mode: 'insensitive' } } },
          { stops: { some: { location_name: { contains: q, mode: 'insensitive' } } } },
        ]
      });
    }

    const whereClause: any = {
      deletedAt: null,
      status: { in: statusFilter },
      ...(customer_id ? { customerId: customer_id as string } : {}),
      ...(andConditions.length > 0 ? { AND: andConditions } : {}),
    };

    const [trips, total, allCounts] = await Promise.all([
      prisma.trip.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [{ planned_start: 'desc' }, { createdAt: 'desc' }],
        include: {
          customer: { select: { id: true, name: true, contact_phone: true } },
          driver: { select: { id: true, first_name: true, last_name: true, ref_id: true } },
          vehicle: { select: { id: true, plate_number: true, asset_type: true } },
          stops: {
            where: { deletedAt: null },
            orderBy: { stop_sequence: 'asc' },
            select: {
              stop_sequence: true, stop_type: true, location_name: true,
              location: { select: { id: true, name: true } }
            }
          },
          invoices: {
            where: { deletedAt: null },
            select: { id: true, ref_id: true, status: true, total_amount: true, zatca_ref: true, invoicing_note: true, createdAt: true }
          }
        }
      }),
      prisma.trip.count({ where: whereClause }),
      // Summary counts always over the full customer-filtered set (ignoring date/search/status filters)
      prisma.trip.groupBy({
        by: ['status'],
        where: {
          deletedAt: null,
          status: { in: [TripStatus.Completed, TripStatus.Invoiced] },
          ...(customer_id ? { customerId: customer_id as string } : {}),
        },
        _count: true,
      }),
    ]);

    const completedCount = allCounts.find(r => r.status === TripStatus.Completed)?._count ?? 0;
    const invoicedCount = allCounts.find(r => r.status === TripStatus.Invoiced)?._count ?? 0;
    const totalTrips = completedCount + invoicedCount;

    res.json({
      success: true,
      data: trips,
      meta: {
        page: pageNumber,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit),
        summary: {
          total_trips: totalTrips,
          completed: completedCount,
          invoiced: invoicedCount,
          coverage_pct: totalTrips > 0 ? Math.round((invoicedCount / totalTrips) * 10000) / 100 : 100,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch billing ledger' } });
  }
};

/**
 * GET /invoices/billing-ledger/by-customer
 * Returns one summary row per customer (company) with their billing stats and trip list.
 * Used by the Company Billing Ledger page.
 */
export const getCustomerBillingLedger = async (req: Request, res: Response) => {
  try {
    const { date_from, date_to, invoice_status, search } = req.query;

    let statusFilter: TripStatus[];
    if (invoice_status === 'NotInvoiced') {
      statusFilter = [TripStatus.Completed];
    } else if (invoice_status === 'Invoiced') {
      statusFilter = [TripStatus.Invoiced];
    } else {
      statusFilter = [TripStatus.Completed, TripStatus.Invoiced];
    }

    const andConditions: any[] = [];

    if (date_from) {
      const from = new Date(date_from as string);
      from.setHours(0, 0, 0, 0);
      andConditions.push({
        OR: [
          { planned_start: { gte: from } },
          { AND: [{ planned_start: null }, { createdAt: { gte: from } }] }
        ]
      });
    }
    if (date_to) {
      const to = new Date(date_to as string);
      to.setHours(23, 59, 59, 999);
      andConditions.push({
        OR: [
          { planned_start: { lte: to } },
          { AND: [{ planned_start: null }, { createdAt: { lte: to } }] }
        ]
      });
    }
    if (search && String(search).trim()) {
      const q = String(search).trim();
      andConditions.push({
        OR: [
          { customer: { name: { contains: q, mode: 'insensitive' } } },
          { ref_id: { contains: q, mode: 'insensitive' } },
        ]
      });
    }

    const whereClause: any = {
      deletedAt: null,
      status: { in: statusFilter },
      ...(andConditions.length > 0 ? { AND: andConditions } : {}),
    };

    // Fetch all matching trips grouped under their customers
    const trips = await prisma.trip.findMany({
      where: whereClause,
      orderBy: [{ planned_start: 'desc' }, { createdAt: 'desc' }],
      include: {
        customer: { select: { id: true, name: true, contact_phone: true } },
        stops: {
          where: { deletedAt: null },
          orderBy: { stop_sequence: 'asc' },
          select: {
            stop_sequence: true, stop_type: true, location_name: true,
            location: { select: { id: true, name: true } }
          }
        },
        invoices: {
          where: { deletedAt: null },
          select: { id: true, ref_id: true, status: true, total_amount: true, zatca_ref: true, invoicing_note: true, createdAt: true }
        }
      }
    });

    // Group by customer
    const customerMap = new Map<string, {
      customer: any;
      trips: any[];
      total_trips: number;
      completed: number;
      invoiced: number;
      total_billing: number;
      invoiced_amount: number;
      pending_amount: number;
    }>();

    for (const trip of trips) {
      if (!trip.customer) continue;
      const cid = trip.customer.id;
      if (!customerMap.has(cid)) {
        customerMap.set(cid, {
          customer: trip.customer,
          trips: [],
          total_trips: 0,
          completed: 0,
          invoiced: 0,
          total_billing: 0,
          invoiced_amount: 0,
          pending_amount: 0,
        });
      }
      const entry = customerMap.get(cid)!;
      const billingTotal = Number(trip.billing_amount ?? trip.trip_charges ?? 0)
        + Number(trip.waiting_labor_charges ?? 0)
        + Number(trip.additional_stop_charges ?? 0);

      entry.trips.push(trip);
      entry.total_trips++;
      entry.total_billing += billingTotal;

      if (trip.status === TripStatus.Invoiced) {
        entry.invoiced++;
        entry.invoiced_amount += billingTotal;
      } else {
        entry.completed++;
        entry.pending_amount += billingTotal;
      }
    }

    const customers = Array.from(customerMap.values()).map(c => ({
      customer: c.customer,
      total_trips: c.total_trips,
      completed: c.completed,
      invoiced: c.invoiced,
      coverage_pct: c.total_trips > 0 ? Math.round((c.invoiced / c.total_trips) * 10000) / 100 : 100,
      total_billing: Math.round(c.total_billing * 100) / 100,
      invoiced_amount: Math.round(c.invoiced_amount * 100) / 100,
      pending_amount: Math.round(c.pending_amount * 100) / 100,
      trips: c.trips,
    }));

    // Sort: customers with most pending first, then by name
    customers.sort((a, b) => b.completed - a.completed || a.customer.name.localeCompare(b.customer.name));

    const totalCompleted = customers.reduce((s, c) => s + c.completed, 0);
    const totalInvoiced  = customers.reduce((s, c) => s + c.invoiced, 0);
    const totalTrips     = customers.reduce((s, c) => s + c.total_trips, 0);
    const totalBilling   = Math.round(customers.reduce((s, c) => s + c.total_billing, 0) * 100) / 100;
    const totalInvoicedAmt = Math.round(customers.reduce((s, c) => s + c.invoiced_amount, 0) * 100) / 100;
    const totalPendingAmt  = Math.round(customers.reduce((s, c) => s + c.pending_amount, 0) * 100) / 100;

    res.json({
      success: true,
      data: customers,
      meta: {
        total_customers: customers.length,
        summary: {
          total_trips: totalTrips,
          completed: totalCompleted,
          invoiced: totalInvoiced,
          coverage_pct: totalTrips > 0 ? Math.round((totalInvoiced / totalTrips) * 10000) / 100 : 100,
          total_billing: totalBilling,
          invoiced_amount: totalInvoicedAmt,
          pending_amount: totalPendingAmt,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch customer billing ledger' } });
  }
};

