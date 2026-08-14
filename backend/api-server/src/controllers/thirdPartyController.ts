import { Request, Response } from 'express';
import { prisma } from '../index';
import { buildSearchAnd } from '../utils/search';

const THIRD_PARTY_SEARCH_FIELDS = ['name', 'contact_person', 'phone', 'email', 'tax_id'];

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
            select: { trips: true },
          },
        },
      }),
      prisma.thirdPartyProvider.count({ where: whereClause }),
    ]);

    // Compute additional aggregated stats per provider
    const formattedProviders = await Promise.all(
      providers.map(async (provider: any) => {
        const activeTripsCount = await prisma.trip.count({
          where: {
            thirdPartyProviderId: provider.id,
            status: { in: ['Draft', 'Dispatched', 'AtPickup', 'InTransit', 'AtDelivery'] },
            deletedAt: null,
          },
        });

        const totalCostAggregate = await prisma.trip.aggregate({
          where: {
            thirdPartyProviderId: provider.id,
            deletedAt: null,
          },
          _sum: { third_party_cost: true },
        });

        return {
          ...provider,
          total_trips: provider._count?.trips || 0,
          active_trips: activeTripsCount,
          total_cost: totalCostAggregate._sum.third_party_cost || 0,
        };
      })
    );

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

export const getThirdPartyProviderById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const provider: any = await prisma.thirdPartyProvider.findFirst({
      where: { id, deletedAt: null },
      include: {
        trips: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { customer: true },
        },
        _count: { select: { trips: true } },
      },
    });

    if (!provider) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Third-party provider not found' } });
    }

    const activeTripsCount = await prisma.trip.count({
      where: {
        thirdPartyProviderId: provider.id,
        status: { in: ['Draft', 'Dispatched', 'AtPickup', 'InTransit', 'AtDelivery'] },
        deletedAt: null,
      },
    });

    const totalCostAggregate = await prisma.trip.aggregate({
      where: {
        thirdPartyProviderId: provider.id,
        deletedAt: null,
      },
      _sum: { third_party_cost: true },
    });

    res.json({
      success: true,
      data: {
        ...provider,
        total_trips: provider._count?.trips || 0,
        active_trips: activeTripsCount,
        total_cost: totalCostAggregate._sum.third_party_cost || 0,
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

    await prisma.thirdPartyProvider.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    console.error('Failed to delete third party provider:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete third party provider' } });
  }
};
