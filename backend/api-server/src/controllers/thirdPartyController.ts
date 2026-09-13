import { Request, Response } from 'express';
import { prisma } from '../db';
import { buildSearchAnd } from '../utils/search';
import { TripStatus } from '@prisma/client';

const THIRD_PARTY_SEARCH_FIELDS = ['name', 'contact_person', 'phone', 'email', 'tax_id'];

// Trip statuses that mean the trip is actively started and in progress.
const ACTIVE_TRIP_STATUSES = ['Loading', 'InTransit', 'Delayed'];

export const getThirdPartyProviders = async (req: Request, res: Response) => {
  try {
    const { is_active, search, page = '1', per_page = '50' } = req.query;

    const pageNumber = parseInt(page as string);
    const limit = parseInt(per_page as string);
    const skip = (pageNumber - 1) * limit;

    const whereClause: any = { deletedAt: null };
    if (is_active !== undefined) {
      whereClause.isActive = is_active === 'true';
    }

    const searchAnd = buildSearchAnd(search, THIRD_PARTY_SEARCH_FIELDS);
    if (searchAnd.length > 0) {
      whereClause.AND = searchAnd;
    }

    const [providers, total] = await Promise.all([
      prisma.thirdPartyProvider.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { subcontracts: { where: { trip: { deletedAt: null } } } },
          },
        },
      }),
      prisma.thirdPartyProvider.count({ where: whereClause }),
    ]);

    const providerIds = providers.map((p: any) => p.id);
    const [activeByProvider, totalsByProvider] = providerIds.length === 0
      ? [[], []]
      : await Promise.all([
          prisma.tripSubcontract.groupBy({
            by: ['providerId'],
            where: {
              providerId: { in: providerIds },
              trip: { status: { in: ACTIVE_TRIP_STATUSES as TripStatus[] }, deletedAt: null },
            },
            _count: { _all: true },
          }),
          prisma.tripSubcontract.groupBy({
            by: ['providerId'],
            where: { providerId: { in: providerIds }, trip: { deletedAt: null } },
            _sum: { cost: true },
          }),
        ]);

    const activeCountById = new Map<string, number>(
      activeByProvider.map((row: any) => [row.providerId as string, row._count._all])
    );
    const totalsById = new Map<string, { cost: number }>(
      totalsByProvider.map((row: any) => [
        row.providerId as string,
        { cost: Number(row._sum.cost ?? 0) },
      ])
    );

    const formattedProviders = providers.map((provider: any) => ({
      ...provider,
      total_trips: provider._count?.subcontracts || 0,
      active_trips: activeCountById.get(provider.id) || 0,
      total_cost: totalsById.get(provider.id)?.cost || 0,
      total_revenue: 0,
    }));

    res.json({
      success: true,
      data: formattedProviders,
      meta: {
        page: pageNumber,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch third party providers:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch third party providers' } });
  }
};

export const getThirdPartyStats = async (_req: Request, res: Response) => {
  try {
    const where = { deletedAt: null };
    const [total, active, tripTotals] = await Promise.all([
      prisma.thirdPartyProvider.count({ where }),
      prisma.thirdPartyProvider.count({ where: { ...where, isActive: true } }),
      prisma.tripSubcontract.aggregate({
        where: { providerId: { not: null }, trip: { deletedAt: null } },
        _count: { _all: true },
        _sum: { cost: true },
      }),
    ]);

    const totalCost = Number(tripTotals._sum.cost ?? 0);

    res.json({
      success: true,
      data: {
        total,
        active,
        inactive: total - active,
        total_trips: tripTotals._count._all,
        total_cost: totalCost,
        total_revenue: 0,
        net_profit: 0 - totalCost,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to compute third-party stats' } });
  }
};

export const getThirdPartyProviderById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const provider: any = await prisma.thirdPartyProvider.findFirst({
      where: { id, deletedAt: null },
      include: {
        subcontracts: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { trip: { include: { customer: true } } },
        },
        _count: { select: { subcontracts: true } },
      },
    });

    if (!provider) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Third-party provider not found' } });
    }

    const activeTripsCount = await prisma.tripSubcontract.count({
      where: {
        providerId: provider.id,
        trip: {
          status: { in: ['Scheduled', 'Loading', 'InTransit', 'Delayed'] },
          deletedAt: null,
        },
      },
    });

    const totalCostAggregate = await prisma.tripSubcontract.aggregate({
      where: {
        providerId: provider.id,
        trip: { deletedAt: null },
      },
      _sum: {
        cost: true,
      },
    });

    res.json({
      success: true,
      data: {
        ...provider,
        trips: (provider.subcontracts || []).map((sc: any) => sc.trip),
        total_trips: provider._count?.subcontracts || 0,
        active_trips: activeTripsCount,
        total_cost: totalCostAggregate._sum.cost || 0,
        total_revenue: 0,
      },
    });
  } catch (error) {
    console.error('Failed to fetch third party provider:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch third party provider' } });
  }
};

export const createThirdPartyProvider = async (req: Request, res: Response) => {
  try {
    const { name, contact_person, phone, email, address, tax_id, notes, rating } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Provider name is required' } });
    }

    const existing = await prisma.thirdPartyProvider.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' }, deletedAt: null },
    });

    if (existing) {
      return res.status(400).json({ success: false, error: { code: 'ALREADY_EXISTS', message: 'A provider with this name already exists' } });
    }

    const provider = await prisma.thirdPartyProvider.create({
      data: {
        name: name.trim(),
        contact_person: contact_person?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        tax_id: tax_id?.trim() || null,
        notes: notes?.trim() || null,
        rating: typeof rating === 'number' ? rating : 5.0,
      },
    });

    res.status(201).json({ success: true, data: provider });
  } catch (error) {
    console.error('Failed to create third party provider:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create third party provider' } });
  }
};

export const updateThirdPartyProvider = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, contact_person, phone, email, address, tax_id, notes, rating, isActive } = req.body;

    const existing = await prisma.thirdPartyProvider.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider not found' } });
    }

    if (name && name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await prisma.thirdPartyProvider.findFirst({
        where: { name: { equals: name.trim(), mode: 'insensitive' }, deletedAt: null, id: { not: id } },
      });
      if (duplicate) {
        return res.status(400).json({ success: false, error: { code: 'ALREADY_EXISTS', message: 'Another provider with this name already exists' } });
      }
    }

    const updated = await prisma.thirdPartyProvider.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(contact_person !== undefined && { contact_person: contact_person?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(tax_id !== undefined && { tax_id: tax_id?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(rating !== undefined && { rating }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update third party provider:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update third party provider' } });
  }
};

export const deleteThirdPartyProvider = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.thirdPartyProvider.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider not found' } });
    }

    await prisma.$transaction([
      prisma.tripSubcontract.updateMany({ where: { providerId: id }, data: { providerId: null } }),
      prisma.thirdPartyProvider.delete({ where: { id } })
    ]);

    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    console.error('Failed to delete third party provider:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete third party provider' } });
  }
};

export const bulkImportThirdPartyProviders = async (req: Request, res: Response) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Rows array is required' } });
    }

    let created = 0;
    let updated = 0;
    let failed = 0;
    const results: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = String(row.name || row.provider_name || row.company || '').trim();

      if (!name) {
        failed++;
        results.push({ row: i + 1, success: false, error: 'Provider name is required' });
        continue;
      }

      try {
        const existing = await prisma.thirdPartyProvider.findFirst({
          where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null },
        });

        if (existing) {
          await prisma.thirdPartyProvider.update({
            where: { id: existing.id },
            data: {
              ...(row.contact_person && { contact_person: String(row.contact_person).trim() }),
              ...(row.phone && { phone: String(row.phone).trim() }),
              ...(row.email && { email: String(row.email).trim() }),
              ...(row.address && { address: String(row.address).trim() }),
              ...(row.tax_id && { tax_id: String(row.tax_id).trim() }),
              ...(row.notes && { notes: String(row.notes).trim() }),
            },
          });
          updated++;
          results.push({ row: i + 1, success: true, label: name, action: 'updated' });
        } else {
          await prisma.thirdPartyProvider.create({
            data: {
              name,
              contact_person: row.contact_person ? String(row.contact_person).trim() : null,
              phone: row.phone ? String(row.phone).trim() : null,
              email: row.email ? String(row.email).trim() : null,
              address: row.address ? String(row.address).trim() : null,
              tax_id: row.tax_id ? String(row.tax_id).trim() : null,
              notes: row.notes ? String(row.notes).trim() : null,
            },
          });
          created++;
          results.push({ row: i + 1, success: true, label: name, action: 'created' });
        }
      } catch (err: any) {
        failed++;
        results.push({ row: i + 1, success: false, label: name, error: err?.message || 'Database error' });
      }
    }

    res.json({
      success: true,
      data: {
        total: rows.length,
        created,
        updated,
        failed,
        results,
      },
    });
  } catch (error) {
    console.error('Failed to bulk import third party providers:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to bulk import third party providers' } });
  }
};
