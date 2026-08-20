import { Request, Response } from 'express';
import { prisma } from '../index';
import { buildSearchAnd } from '../utils/search';

const CUSTOMER_SEARCH_FIELDS = ['name', 'contact_phone'];

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const { is_active, search, page = '1', per_page = '20' } = req.query;
    
    const pageNumber = parseInt(page as string);
    const limit = parseInt(per_page as string);
    const skip = (pageNumber - 1) * limit;

    const whereClause: any = { deletedAt: null };
    if (is_active !== undefined) {
      whereClause.isActive = is_active === 'true';
    }
    const searchAnd = buildSearchAnd(search, CUSTOMER_SEARCH_FIELDS);
    if (searchAnd.length > 0) {
      whereClause.AND = searchAnd;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { trips: true } } },
      }),
      prisma.customer.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: customers,
      meta: {
        page: pageNumber,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch customers' } });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const idOrRef = req.params.id as string;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);
    const whereClause: any = isUuid
      ? { id: idOrRef, deletedAt: null }
      : {
          name: { equals: idOrRef, mode: 'insensitive' },
          deletedAt: null,
        };

    const customer = await prisma.customer.findFirst({
      where: whereClause,
      include: { trips: { take: 5, orderBy: { createdAt: 'desc' } } }
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch customer' } });
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const { name, contact_phone, whatsapp_number, whatsapp_group_link, whatsapp_group_name, credit_limit } = req.body;
    
    const customer = await (prisma.customer as any).create({
      data: {
        name,
        contact_phone,
        whatsapp_number,
        whatsapp_group_link,
        whatsapp_group_name,
        credit_limit: credit_limit || 0,
        created_by: (req as any).user?.id
      }
    });
    
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create customer' } });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const updated = await prisma.customer.update({
      where: { id: req.params.id as string },
      data: {
        ...req.body,
        updated_by: (req as any).user?.id
      }
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update customer' } });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    await prisma.customer.update({
      where: { id: req.params.id as string },
      data: {
        deletedAt: new Date(),
        isActive: false,
        deleted_by: (req as any).user?.id
      }
    });
    res.json({ success: true, data: { message: 'Customer deleted successfully' } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete customer' } });
  }
};

export const bulkImportCustomers = async (req: Request, res: Response) => {
  try {
    const { rows } = req.body as { rows: Record<string, any>[] };
    const userId = (req as any).user?.id;
    const results: any[] = [];

    for (let i = 0; i < (rows || []).length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;
      const label = row.name ? String(row.name).trim() : `Row ${rowNumber}`;

      try {
        if (!row.name || !String(row.name).trim()) {
          results.push({ row: rowNumber, success: false, label, error: 'Company Name is missing' });
          continue;
        }

        const name = String(row.name).trim();
        const contact_phone = String(row.contact_phone || row.phone || '').trim();

        if (!contact_phone) {
          results.push({ row: rowNumber, success: false, label, error: 'Primary Contact Phone is missing' });
          continue;
        }

        const existing = await prisma.customer.findFirst({
          where: {
            OR: [
              { contact_phone: contact_phone },
              { name: { equals: name, mode: 'insensitive' } }
            ]
          }
        });

        if (existing) {
          await prisma.customer.update({
            where: { id: existing.id },
            data: {
              name,
              contact_phone,
              ...(existing.deletedAt ? { deletedAt: null, deleted_by: null, isActive: true } : {}),
              updated_by: userId,
            }
          });
          results.push({ row: rowNumber, success: true, label, action: 'updated' });
        } else {
          const created = await prisma.customer.create({
            data: {
              name,
              contact_phone,
              created_by: userId,
            }
          });
          results.push({ row: rowNumber, success: true, label, action: 'created' });
        }
      } catch (err: any) {
        results.push({ row: rowNumber, success: false, label, error: err.message || 'Could not import customer' });
      }
    }

    const created = results.filter(r => r.success && r.action === 'created').length;
    const updated = results.filter(r => r.success && r.action === 'updated').length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      data: {
        total: rows.length,
        created,
        updated,
        failed,
        results
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to import customers' } });
  }
};
