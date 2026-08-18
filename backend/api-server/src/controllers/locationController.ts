import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../index';
import { getValidUuid } from '../utils/uuid';
import { buildSearchAnd } from '../utils/search';

const LOCATION_SEARCH_FIELDS = ['name', 'address'];

/**
 * Lane endpoints — the shared list of places rate cards are priced between.
 *
 * Everything here keys on the slug rather than the display name: users type
 * "riyadh", "Riyadh " and "RIYADH" for the same place, and if those become
 * three rows then three lanes exist that never match each other or the rate
 * card. The slug is the lowercased, whitespace-collapsed name and carries the
 * unique constraint.
 */
export const toSlug = (name: string) =>
  String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Resolve a place to a Location row, creating it if this is the first time
 * anyone has used it. Shared with the rate card and trip controllers, which
 * both let the user name a place that isn't on the list yet.
 *
 * A soft-deleted row with the same slug is revived rather than duplicated —
 * the slug is unique across deleted rows too, so a blind create would throw.
 */
export const resolveLocation = async (
  tx: Pick<Prisma.TransactionClient, 'location'>,
  input: { id?: string | null; name?: string | null; address?: string | null; lat?: number | null; lng?: number | null },
  userId?: string | null
) => {
  const validUserId = getValidUuid(userId);
  if (input.id) {
    const existing = await tx.location.findFirst({ where: { id: input.id, deletedAt: null } });
    if (!existing) throw new Error('LOCATION_NOT_FOUND');
    return existing;
  }

  const name = String(input.name || '').trim();
  if (!name) return null;

  const slug = toSlug(name);
  const found = await tx.location.findUnique({ where: { slug } });

  if (found) {
    // Revive a previously deleted place, and backfill coordinates or an address
    // if it never had any — but never overwrite values someone deliberately set.
    const needsCoords = found.lat == null && input.lat != null;
    const needsAddress = !found.address && !!input.address;

    if (found.deletedAt || needsCoords || needsAddress) {
      return tx.location.update({
        where: { id: found.id },
        data: {
          ...(found.deletedAt ? { deletedAt: null, deleted_by: null, is_active: true } : {}),
          ...(needsCoords ? { lat: input.lat, lng: input.lng ?? null } : {}),
          ...(needsAddress ? { address: input.address } : {}),
          updated_by: validUserId,
        },
      });
    }
    return found;
  }

  return tx.location.create({
    data: {
      name,
      slug,
      address: input.address ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      created_by: validUserId,
    },
  });
};

export const getLocations = async (req: Request, res: Response) => {
  try {
    const { search, active_only } = req.query;

    const whereClause: any = { deletedAt: null };
    if (active_only === 'true') whereClause.is_active = true;
    const searchAnd = buildSearchAnd(search, LOCATION_SEARCH_FIELDS);
    if (searchAnd.length > 0) whereClause.AND = searchAnd;

    // Usage counts come back with the list so the page can separate places that
    // are actually in use from typos and abandoned entries — which is the whole
    // reason to look at this list. Counting rate cards on both ends of the lane
    // separately, because a place can be an origin, a destination, or both.
    const locations = await prisma.location.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            originRateCards: { where: { deletedAt: null } },
            destinationRateCards: { where: { deletedAt: null } },
            tripStops: { where: { deletedAt: null } },
          },
        },
      },
    });

    res.json({ success: true, data: locations });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch locations' } });
  }
};

export const getLocationById = async (req: Request, res: Response) => {
  try {
    const location = await prisma.location.findFirst({
      where: { id: req.params.id as string, deletedAt: null },
    });
    if (!location) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } });
    }
    res.json({ success: true, data: location });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch location' } });
  }
};

export const createLocation = async (req: Request, res: Response) => {
  try {
    const { name, address, lat, lng } = req.body;
    if (!String(name || '').trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Location name is required' } });
    }

    const location = await resolveLocation(
      prisma,
      {
        name,
        address: String(address || '').trim() || null,
        lat: lat === undefined || lat === null || lat === '' ? null : Number(lat),
        lng: lng === undefined || lng === null || lng === '' ? null : Number(lng),
      },
      (req as any).user?.id
    );

    res.status(201).json({ success: true, data: location });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create location' } });
  }
};

export const updateLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address, lat, lng, is_active } = req.body;

    const existing = await prisma.location.findFirst({ where: { id: id as string, deletedAt: null } });
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } });
    }

    const trimmedName = name === undefined ? undefined : String(name).trim();
    if (trimmedName !== undefined && !trimmedName) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Location name cannot be empty' } });
    }

    if (trimmedName !== undefined && toSlug(trimmedName) !== existing.slug) {
      const clash = await prisma.location.findUnique({ where: { slug: toSlug(trimmedName) } });
      if (clash) {
        return res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE', message: `"${clash.name}" already exists — rename or use that one instead.` },
        });
      }
    }

    // Renaming a place has to carry through to every rate card that quotes it,
    // because route_origin/route_destination are a denormalised copy of these
    // names. Left alone, the lists would keep showing the old spelling.
    const updated = await prisma.$transaction(async (tx) => {
      const location = await tx.location.update({
        where: { id: id as string },
        data: {
          ...(trimmedName !== undefined ? { name: trimmedName, slug: toSlug(trimmedName) } : {}),
          ...(address !== undefined ? { address: String(address || '').trim() || null } : {}),
          ...(lat !== undefined ? { lat: lat === null || lat === '' ? null : Number(lat) } : {}),
          ...(lng !== undefined ? { lng: lng === null || lng === '' ? null : Number(lng) } : {}),
          ...(is_active !== undefined ? { is_active: !!is_active } : {}),
          updated_by: getValidUuid((req as any).user?.id),
          version: existing.version + 1,
        },
      });

      if (trimmedName !== undefined && trimmedName !== existing.name) {
        await tx.rateCard.updateMany({
          where: { originLocationId: location.id },
          data: { route_origin: location.name },
        });
        await tx.rateCard.updateMany({
          where: { destinationLocationId: location.id },
          data: { route_destination: location.name },
        });
      }

      return location;
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update location' } });
  }
};

/**
 * Bulk-import a city/lane-endpoint list — parsed client-side from an .xlsx,
 * posted as JSON, same contract as the other entities' /import routes.
 *
 * Reuses resolveLocation for the actual create-or-revive-by-slug logic, so
 * this gets the same "don't overwrite coordinates someone already set"
 * behaviour as every other caller for free — importing the same sheet twice
 * (e.g. after the client corrects one row) is safe.
 */
export const bulkImportLocations = async (req: Request, res: Response) => {
  try {
    const rows: Record<string, any>[] = req.body.rows || [];
    const userId = getValidUuid((req as any).user?.id);
    const results: any[] = [];

    const customerCache = new Map<string, any>();
    const findCustomer = async (custName: string) => {
      const key = custName.toLowerCase();
      if (customerCache.has(key)) return customerCache.get(key);
      const customer = await prisma.customer.findFirst({
        where: { deletedAt: null, name: { equals: custName, mode: 'insensitive' } },
      });
      customerCache.set(key, customer);
      return customer;
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;
      const rawName = String(row.name || row.label || row.location || row.place || '').trim();
      const customerName = String(row.customer_name || row.company_name || row.customer || '').trim();
      const displayLabel = [customerName, rawName].filter(Boolean).join(' — ') || `Row ${rowNumber}`;

      try {
        if (!rawName) {
          results.push({ row: rowNumber, success: false, label: displayLabel, error: 'Location name/label is missing' });
          continue;
        }

        const lat = row.lat !== undefined && row.lat !== null && String(row.lat).trim() !== '' ? Number(row.lat) : null;
        const lng = row.lng !== undefined && row.lng !== null && String(row.lng).trim() !== '' ? Number(row.lng) : null;
        const address = String(row.address || '').trim() || null;

        // If customer_name is present and customer exists, save to CustomerSavedLocation as well
        if (customerName) {
          const customer = await findCustomer(customerName);
          if (customer && lat !== null && lng !== null) {
            const existingSaved = await prisma.customerSavedLocation.findFirst({
              where: { deletedAt: null, customerId: customer.id, label: { equals: rawName, mode: 'insensitive' } },
            });
            if (existingSaved) {
              await prisma.customerSavedLocation.update({
                where: { id: existingSaved.id },
                data: { address, lat, lng, updated_by: userId },
              });
            } else {
              await prisma.customerSavedLocation.create({
                data: { customerId: customer.id, label: rawName, address, lat, lng, created_by: userId },
              });
            }
          }
        }

        const existingBefore = await prisma.location.findUnique({ where: { slug: toSlug(rawName) } });

        const location = await resolveLocation(
          prisma,
          {
            name: rawName,
            address,
            lat,
            lng,
          },
          userId
        );

        results.push({
          row: rowNumber,
          success: true,
          label: displayLabel,
          action: existingBefore ? 'updated' : 'created',
        });
        void location;
      } catch (err: any) {
        results.push({ row: rowNumber, success: false, label: displayLabel, error: err.message || 'Failed to import this row' });
      }
    }

    const created = results.filter((r) => r.success && r.action === 'created').length;
    const updated = results.filter((r) => r.success && r.action === 'updated').length;
    const failed = results.filter((r) => !r.success).length;

    res.json({ success: true, data: { total: rows.length, created, updated, failed, results } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to import locations' } });
  }
};

export const deleteLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // A place still priced on a live rate card can't be removed — deleting it
    // would leave lanes that render as "→ Jeddah" with no origin, and a rate
    // lookup that silently stops matching.
    const inUse = await prisma.rateCard.count({
      where: {
        deletedAt: null,
        OR: [{ originLocationId: id as string }, { destinationLocationId: id as string }],
      },
    });
    if (inUse > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'IN_USE',
          message: `This location is used by ${inUse} rate card${inUse === 1 ? '' : 's'}. Delete or re-point those first.`,
        },
      });
    }

    await prisma.location.update({
      where: { id: id as string },
      data: {
        deletedAt: new Date(),
        is_active: false,
        deleted_by: getValidUuid((req as any).user?.id),
      },
    });

    res.json({ success: true, data: { message: 'Location deleted successfully' } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete location' } });
  }
};
