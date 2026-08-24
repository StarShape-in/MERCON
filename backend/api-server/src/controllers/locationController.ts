import { Request, Response } from 'express';
import { Prisma, CoordinatePrecision } from '@prisma/client';
import { prisma } from '../db';
import { getValidUuid } from '../utils/uuid';
import { buildSearchAnd } from '../utils/search';

const LOCATION_SEARCH_FIELDS = ['name', 'code', 'address', 'city'];

export const toSlug = (name: string) =>
  String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');

export const generateLocationCode = (name: string): string => {
  const cleaned = String(name || '').trim().toUpperCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^A-Z0-9\s]/g, '')
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]);
  } else if (words.length === 2) {
    return (words[0].substring(0, 2) + words[1][0]);
  } else if (words.length === 1 && words[0].length >= 3) {
    return words[0].substring(0, 3);
  }
  return (cleaned + 'LOC').substring(0, 3);
};

export const resolvePrecision = (
  lat: number | null | undefined,
  lng: number | null | undefined,
  requestedPrecision?: CoordinatePrecision | null
): CoordinatePrecision => {
  if (lat == null || lng == null) {
    return CoordinatePrecision.UNKNOWN;
  }
  if (requestedPrecision && (requestedPrecision === CoordinatePrecision.EXACT || requestedPrecision === CoordinatePrecision.APPROXIMATE)) {
    return requestedPrecision;
  }
  return CoordinatePrecision.APPROXIMATE;
};

export const resolveLocation = async (
  tx: Pick<Prisma.TransactionClient, 'location'>,
  input: {
    id?: string | null;
    customerId?: string | null;
    code?: string | null;
    name?: string | null;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    lat?: number | null;
    lng?: number | null;
    coordinate_precision?: CoordinatePrecision | null;
  },
  userId?: string | null
) => {
  const validUserId = getValidUuid(userId);
  const idToUse = getValidUuid(input.id);
  const customerIdToUse = getValidUuid(input.customerId);

  if (idToUse) {
    const existing = await tx.location.findFirst({ where: { id: idToUse, deletedAt: null } });
    if (!existing) throw new Error('LOCATION_NOT_FOUND');
    if (customerIdToUse && existing.customerId !== customerIdToUse) {
      throw new Error('CROSS_CUSTOMER_LOCATION_MISMATCH: Location belongs to a different customer.');
    }
    return existing;
  }

  const name = String(input.name || '').trim();
  if (!name) return null;

  if (!customerIdToUse) {
    throw new Error('Customer ID is required for customer-scoped location lookup');
  }

  const slug = toSlug(name);
  const baseCode = input.code ? String(input.code).trim().toUpperCase() : generateLocationCode(name);

  let codeToUse = baseCode;
  let codeIdx = 1;
  while (await tx.location.findFirst({ where: { customerId: customerIdToUse, code: codeToUse } })) {
    codeToUse = `${baseCode.substring(0, 2)}${codeIdx}`;
    codeIdx++;
  }

  const found = await tx.location.findFirst({
    where: { customerId: customerIdToUse, slug, deletedAt: null }
  });

  const precision = resolvePrecision(input.lat, input.lng, input.coordinate_precision);

  if (found) {
    const needsCoords = found.lat == null && input.lat != null;
    const needsAddress = !found.address && !!input.address;

    if (needsCoords || needsAddress || (input.coordinate_precision && found.coordinate_precision !== precision)) {
      return tx.location.update({
        where: { id: found.id },
        data: {
          ...(needsCoords ? { lat: input.lat, lng: input.lng ?? null } : {}),
          ...(needsAddress ? { address: input.address } : {}),
          coordinate_precision: precision,
          updated_by: validUserId,
        },
      });
    }
    return found;
  }

  return tx.location.create({
    data: {
      customerId: customerIdToUse,
      code: codeToUse,
      name,
      slug,
      address: input.address ?? null,
      city: input.city ?? null,
      postalCode: input.postalCode ?? null,
      lat: precision === CoordinatePrecision.UNKNOWN ? null : (input.lat ?? null),
      lng: precision === CoordinatePrecision.UNKNOWN ? null : (input.lng ?? null),
      coordinate_precision: precision,
      created_by: validUserId,
    },
  });
};

export const getLocations = async (req: Request, res: Response) => {
  try {
    const { search, active_only, customerId, customer_id, coordinate_precision } = req.query;
    const rawCustId = (customerId || customer_id) as string;
    const targetCustomerId = rawCustId ? getValidUuid(rawCustId) : null;

    const whereClause: any = { deletedAt: null };
    if (targetCustomerId) whereClause.customerId = targetCustomerId;
    if (active_only === 'true') whereClause.is_active = true;
    if (coordinate_precision && Object.values(CoordinatePrecision).includes(coordinate_precision as any)) {
      whereClause.coordinate_precision = coordinate_precision;
    }

    const searchAnd = buildSearchAnd(search, LOCATION_SEARCH_FIELDS);
    if (searchAnd.length > 0) whereClause.AND = searchAnd;

    const locations = await prisma.location.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: {
        customer: { select: { id: true, name: true } },
        _count: {
          select: {
            quotationStops: true,
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
      where: { id: req.params.id as string },
      include: {
        customer: { select: { id: true, name: true, company_name: true, tax_number: true } },
        _count: {
          select: {
            quotationStops: true,
            tripStops: { where: { deletedAt: null } },
          },
        },
        quotationStops: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            quotation: {
              select: {
                id: true,
                quotationNumber: true,
                status: true,
                rate_amount: true,
                currency: true,
                billing_type: true,
                vehicle_class: true,
                customer: { select: { id: true, name: true } },
                stops: {
                  orderBy: { sequence: 'asc' },
                  include: {
                    location: { select: { id: true, name: true, code: true } }
                  }
                }
              }
            }
          }
        },
        tripStops: {
          take: 20,
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          include: {
            trip: {
              select: {
                id: true,
                ref_id: true,
                status: true,
                planned_start: true,
                actual_start: true,
                billing_amount: true,
                customer: { select: { id: true, name: true } },
                stops: {
                  orderBy: { stop_sequence: 'asc' },
                  select: {
                    id: true,
                    stop_sequence: true,
                    stop_type: true,
                    location_name: true,
                    location_lat: true,
                    location_lng: true,
                    location: { select: { id: true, name: true, code: true } }
                  }
                }
              }
            }
          }
        }
      },
    });
    if (!location) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } });
    }
    res.json({ success: true, data: location });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to fetch location' } });
  }
};

export const createLocation = async (req: Request, res: Response) => {
  try {
    const { name, customerId, customer_id, code, address, city, postalCode, lat, lng, coordinate_precision } = req.body;
    const rawCustId = (customerId || customer_id) as string;
    const targetCustomerId = rawCustId ? getValidUuid(rawCustId) : null;

    if (!targetCustomerId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please select a customer for this location' } });
    }
    if (!String(name || '').trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Location name is required' } });
    }

    const numericLat = lat === undefined || lat === null || lat === '' ? null : Number(lat);
    const numericLng = lng === undefined || lng === null || lng === '' ? null : Number(lng);

    if ((coordinate_precision === CoordinatePrecision.EXACT || coordinate_precision === CoordinatePrecision.APPROXIMATE) && (numericLat == null || numericLng == null)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Coordinates are required for EXACT or APPROXIMATE precision.' },
      });
    }

    const precision = resolvePrecision(numericLat, numericLng, coordinate_precision);

    const location = await resolveLocation(
      prisma,
      {
        customerId: targetCustomerId,
        code,
        name,
        address: String(address || '').trim() || null,
        city: String(city || '').trim() || null,
        postalCode: String(postalCode || '').trim() || null,
        lat: numericLat,
        lng: numericLng,
        coordinate_precision: precision,
      },
      (req as any).user?.id
    );

    res.status(201).json({ success: true, data: location });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to create location' } });
  }
};

export const updateLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, address, city, postalCode, lat, lng, coordinate_precision, is_active } = req.body;

    const existing = await prisma.location.findFirst({ where: { id: id as string } });
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } });
    }

    const trimmedName = name === undefined ? undefined : String(name).trim();
    if (trimmedName !== undefined && !trimmedName) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Location name cannot be empty' } });
    }

    const newSlug = trimmedName !== undefined ? toSlug(trimmedName) : existing.slug;
    const newCode = code !== undefined ? String(code).trim().toUpperCase() : existing.code;

    if (newCode !== existing.code) {
      const codeClash = await prisma.location.findFirst({
        where: { customerId: existing.customerId, code: newCode, id: { not: existing.id } }
      });
      if (codeClash) {
        return res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE', message: `Code "${newCode}" is already in use for this customer.` },
        });
      }
    }

    const nextLat = lat !== undefined ? (lat === null || lat === '' ? null : Number(lat)) : existing.lat;
    const nextLng = lng !== undefined ? (lng === null || lng === '' ? null : Number(lng)) : existing.lng;
    const requestedPrecision = coordinate_precision !== undefined ? coordinate_precision : existing.coordinate_precision;

    if ((requestedPrecision === CoordinatePrecision.EXACT || requestedPrecision === CoordinatePrecision.APPROXIMATE) && (nextLat == null || nextLng == null)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Coordinates are required for EXACT or APPROXIMATE precision.' },
      });
    }

    const finalPrecision = resolvePrecision(nextLat, nextLng, requestedPrecision);

    const updateData: Prisma.LocationUpdateInput = {
      ...(trimmedName !== undefined ? { name: trimmedName, slug: newSlug } : {}),
      ...(code !== undefined ? { code: newCode } : {}),
      ...(address !== undefined ? { address: String(address || '').trim() || null } : {}),
      ...(city !== undefined ? { city: String(city || '').trim() || null } : {}),
      ...(postalCode !== undefined ? { postalCode: String(postalCode || '').trim() || null } : {}),
      lat: finalPrecision === CoordinatePrecision.UNKNOWN ? null : nextLat,
      lng: finalPrecision === CoordinatePrecision.UNKNOWN ? null : nextLng,
      coordinate_precision: finalPrecision,
      updated_by: getValidUuid((req as any).user?.id),
      version: existing.version + 1,
    };

    if (is_active !== undefined) {
      updateData.is_active = !!is_active;
      if (is_active) {
        updateData.deletedAt = null;
        updateData.deleted_by = null;
      } else {
        updateData.deletedAt = new Date();
        updateData.deleted_by = getValidUuid((req as any).user?.id);
      }
    }

    const location = await prisma.location.update({
      where: { id: id as string },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, company_name: true, tax_number: true } },
        _count: {
          select: {
            quotationStops: true,
            tripStops: { where: { deletedAt: null } },
          },
        },
      },
    });

    res.json({ success: true, data: location });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to update location' } });
  }
};

export const bulkImportLocations = async (req: Request, res: Response) => {
  try {
    const rows: Record<string, any>[] = req.body.rows || [];
    const userId = getValidUuid((req as any).user?.id);
    const results: any[] = [];

    const customerCache = new Map<string, any>();
    const findCustomer = async (custName: string) => {
      const clean = String(custName || '').trim();
      if (!clean) return null;
      if (customerCache.has(clean)) return customerCache.get(clean);

      const cust = await prisma.customer.findFirst({
        where: { name: { equals: clean, mode: 'insensitive' }, deletedAt: null },
      });
      if (cust) customerCache.set(clean, cust);
      return cust;
    };

    for (const row of rows) {
      const custName = row.customer_name || row.customer || row['Customer'];
      const locName = row.location_name || row.name || row['Location Name'];
      const code = row.code || row['Code'];
      const address = row.address || row['Address'];
      const city = row.city || row['City'];
      const lat = row.lat != null ? Number(row.lat) : null;
      const lng = row.lng != null ? Number(row.lng) : null;

      if (!custName || !locName) continue;

      const cust = await findCustomer(custName);
      if (!cust) continue;

      const precision = resolvePrecision(lat, lng, row.coordinate_precision);

      const loc = await resolveLocation(
        prisma,
        {
          customerId: cust.id,
          code,
          name: locName,
          address,
          city,
          lat,
          lng,
          coordinate_precision: precision,
        },
        userId
      );
      results.push(loc);
    }

    res.json({ success: true, data: { imported: results.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to import locations' } });
  }
};

export const deleteLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const location = await prisma.location.findFirst({
      where: { id: id as string, deletedAt: null },
      include: {
        _count: {
          select: {
            quotationStops: true,
            tripStops: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!location) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } });
    }

    const quotationCount = location._count.quotationStops;
    const tripCount = location._count.tripStops;

    if (quotationCount > 0 || tripCount > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'LOCATION_IN_USE',
          message: `Cannot delete location "${location.name}" because it is referenced by ${quotationCount} quotation stops and ${tripCount} trip stops.`,
          details: { quotationCount, tripCount },
        },
      });
    }

    await prisma.location.update({
      where: { id: id as string },
      data: {
        deletedAt: new Date(),
        deleted_by: getValidUuid((req as any).user?.id),
      },
    });

    res.json({ success: true, message: 'Location deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete location' } });
  }
};
