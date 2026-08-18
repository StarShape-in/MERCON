import { Request, Response } from 'express';
import { prisma } from '../index';
import { getValidUuid } from '../utils/uuid';

/**
 * A customer's own precise, named pickup/dropoff points -- see the model
 * comment in schema.prisma for why this is deliberately separate from the
 * shared city-level Location table. Trip creation surfaces these as quick
 * picks once a customer is chosen, to fill in real coordinates instead of
 * the generic city center.
 */
export const getCustomerSavedLocations = async (req: Request, res: Response) => {
  try {
    const { customerId, active_only } = req.query;
    const normalisedCustomerId = customerId ? getValidUuid(customerId as string) : null;
    if (customerId && !normalisedCustomerId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid customer' } });
    }

    const whereClause: any = { deletedAt: null };
    if (normalisedCustomerId) whereClause.customerId = normalisedCustomerId;
    if (active_only === 'true') whereClause.is_active = true;

    const rows = await prisma.customerSavedLocation.findMany({
      where: whereClause,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: [{ label: 'asc' }],
    });

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch saved locations' } });
  }
};

export const createCustomerSavedLocation = async (req: Request, res: Response) => {
  try {
    const { customerId, label, address, lat, lng } = req.body;
    const userId = getValidUuid((req as any).user?.id);

    const normalisedCustomerId = getValidUuid(customerId);
    if (!normalisedCustomerId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Choose which customer this place belongs to' } });
    }
    const trimmedLabel = String(label || '').trim();
    if (!trimmedLabel) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a label, e.g. "Riyadh HQ"' } });
    }
    const numericLat = Number(lat);
    const numericLng = Number(lng);
    if (isNaN(numericLat) || isNaN(numericLng)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Latitude and longitude are required' } });
    }

    const customer = await prisma.customer.findFirst({ where: { id: normalisedCustomerId, deletedAt: null } });
    if (!customer) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'That customer no longer exists' } });
    }

    const created = await prisma.customerSavedLocation.create({
      data: {
        customerId: normalisedCustomerId,
        label: trimmedLabel,
        address: address ? String(address).trim() || null : null,
        lat: numericLat,
        lng: numericLng,
        created_by: userId,
      },
      include: { customer: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create saved location' } });
  }
};

export const deleteCustomerSavedLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getValidUuid((req as any).user?.id);
    await prisma.customerSavedLocation.update({
      where: { id: id as string },
      data: { deletedAt: new Date(), is_active: false, updated_by: userId },
    });
    res.json({ success: true, data: { message: 'Saved location deleted successfully' } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete saved location' } });
  }
};

/**
 * Bulk-import a customer's saved places -- same client-side-parsed-xlsx,
 * posted-as-JSON contract as the other entities' /import routes. Customer is
 * matched by name (must already exist), same reasoning as bulkImportRateCards.
 */
export const bulkImportCustomerSavedLocations = async (req: Request, res: Response) => {
  try {
    const rows: Record<string, any>[] = req.body.rows || [];
    const userId = getValidUuid((req as any).user?.id);
    const results: any[] = [];

    const customerCache = new Map<string, any>();
    const findCustomer = async (name: string) => {
      const key = name.toLowerCase();
      if (customerCache.has(key)) return customerCache.get(key);
      const customer = await prisma.customer.findFirst({
        where: { deletedAt: null, name: { equals: name, mode: 'insensitive' } },
      });
      customerCache.set(key, customer);
      return customer;
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;
      const customerName = String(row.customer_name || '').trim();
      const label = String(row.label || '').trim();
      const displayLabel = [customerName, label].filter(Boolean).join(' — ') || `Row ${rowNumber}`;

      try {
        if (!customerName) {
          results.push({ row: rowNumber, success: false, label: displayLabel, error: 'Customer is missing' });
          continue;
        }
        if (!label) {
          results.push({ row: rowNumber, success: false, label: displayLabel, error: 'Label is missing' });
          continue;
        }
        const lat = Number(row.lat);
        const lng = Number(row.lng);
        if (isNaN(lat) || isNaN(lng)) {
          results.push({ row: rowNumber, success: false, label: displayLabel, error: 'Latitude/longitude missing or not numbers' });
          continue;
        }

        const customer = await findCustomer(customerName);
        if (!customer) {
          results.push({
            row: rowNumber,
            success: false,
            label: displayLabel,
            error: `Customer "${customerName}" doesn't exist yet — import it on the Customers page first.`,
          });
          continue;
        }

        const address = String(row.address || '').trim() || null;
        const existing = await prisma.customerSavedLocation.findFirst({
          where: { deletedAt: null, customerId: customer.id, label: { equals: label, mode: 'insensitive' } },
        });

        if (existing) {
          await prisma.customerSavedLocation.update({
            where: { id: existing.id },
            data: { address, lat, lng, updated_by: userId },
          });
          results.push({ row: rowNumber, success: true, label: displayLabel, action: 'updated' });
        } else {
          await prisma.customerSavedLocation.create({
            data: { customerId: customer.id, label, address, lat, lng, created_by: userId },
          });
          results.push({ row: rowNumber, success: true, label: displayLabel, action: 'created' });
        }
      } catch (err: any) {
        results.push({ row: rowNumber, success: false, label: displayLabel, error: err.message || 'Failed to import this row' });
      }
    }

    const created = results.filter((r) => r.success && r.action === 'created').length;
    const updated = results.filter((r) => r.success && r.action === 'updated').length;
    const failed = results.filter((r) => !r.success).length;

    res.json({ success: true, data: { total: rows.length, created, updated, failed, results } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to import saved locations' } });
  }
};
