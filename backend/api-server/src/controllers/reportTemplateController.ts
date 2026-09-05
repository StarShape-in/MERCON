import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { prisma } from '../db';
import type { TemplateLayout } from '@mercon/shared-types';
import { inspectTemplate } from '../services/reports/xlsxTemplate/inspect';
import { generateFromTemplate } from '../services/reports/xlsxTemplate/splice';
import { fetchTripRows, TripReportFilters } from '../services/reports/xlsxTemplate/tripReportData';

/* ─── Inspect (no persistence) ────────────────────────────────────────────── */
export const inspectUploadedTemplate = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } });
    }
    const inspection = await inspectTemplate(req.file.buffer);
    res.json({ success: true, data: inspection });
  } catch (error) {
    logger.error({ err: error }, 'Template inspection error:');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to inspect template file' } });
  }
};

/* ─── CRUD ─────────────────────────────────────────────────────────────────── */
export const listReportTemplates = async (_req: Request, res: Response) => {
  try {
    const templates = await prisma.reportTemplate.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        source: true,
        customerId: true,
        customer: { select: { name: true } },
        original_filename: true,
        file_size: true,
        layout: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: templates });
  } catch (error) {
    logger.error({ err: error }, 'List report templates error:');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to list report templates' } });
  }
};

export const getReportTemplate = async (req: Request, res: Response) => {
  try {
    const template = await prisma.reportTemplate.findFirst({
      where: { id: req.params.id as string, deletedAt: null },
      select: {
        id: true,
        name: true,
        source: true,
        customerId: true,
        customer: { select: { name: true } },
        original_filename: true,
        file_size: true,
        layout: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!template) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report template not found' } });
    }
    res.json({ success: true, data: template });
  } catch (error) {
    logger.error({ err: error }, 'Get report template error:');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to get report template' } });
  }
};

export const createReportTemplate = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } });
    }
    const { name, customerId, layout } = req.body;
    if (!name || !layout) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name and layout are required' } });
    }

    let parsedLayout: TemplateLayout;
    try {
      parsedLayout = typeof layout === 'string' ? JSON.parse(layout) : layout;
    } catch {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'layout must be valid JSON' } });
    }

    const userId = (req as any).user?.id;
    const template = await prisma.reportTemplate.create({
      data: {
        name,
        customerId: customerId && customerId !== 'all' ? customerId : null,
        original_filename: req.file.originalname,
        file_data: req.file.buffer,
        file_size: req.file.size,
        layout: parsedLayout as any,
        created_by: userId,
        updated_by: userId,
      },
      select: { id: true, name: true, customerId: true, original_filename: true, file_size: true, layout: true, version: true, createdAt: true },
    });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    logger.error({ err: error }, 'Create report template error:');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create report template' } });
  }
};

export const updateReportTemplate = async (req: Request, res: Response) => {
  try {
    const existing = await prisma.reportTemplate.findFirst({ where: { id: req.params.id as string, deletedAt: null } });
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report template not found' } });
    }

    const { name, customerId, layout } = req.body;
    const data: any = { updated_by: (req as any).user?.id };
    if (name !== undefined) data.name = name;
    if (customerId !== undefined) data.customerId = customerId && customerId !== 'all' ? customerId : null;
    if (layout !== undefined) {
      try {
        data.layout = typeof layout === 'string' ? JSON.parse(layout) : layout;
      } catch {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'layout must be valid JSON' } });
      }
    }
    if (req.file) {
      data.original_filename = req.file.originalname;
      data.file_data = req.file.buffer;
      data.file_size = req.file.size;
    }
    data.version = existing.version + 1;

    const template = await prisma.reportTemplate.update({
      where: { id: req.params.id as string },
      data,
      select: { id: true, name: true, customerId: true, original_filename: true, file_size: true, layout: true, version: true, updatedAt: true },
    });
    res.json({ success: true, data: template });
  } catch (error) {
    logger.error({ err: error }, 'Update report template error:');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update report template' } });
  }
};

export const deleteReportTemplate = async (req: Request, res: Response) => {
  try {
    const existing = await prisma.reportTemplate.findFirst({ where: { id: req.params.id as string, deletedAt: null } });
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report template not found' } });
    }
    await prisma.reportTemplate.update({
      where: { id: req.params.id as string },
      data: { deletedAt: new Date(), deleted_by: (req as any).user?.id, isActive: false },
    });
    res.json({ success: true, data: { id: req.params.id as string } });
  } catch (error) {
    logger.error({ err: error }, 'Delete report template error:');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete report template' } });
  }
};

/* ─── Preview & generate ──────────────────────────────────────────────────── */
function filtersFromBody(req: Request): TripReportFilters {
  const { startDate, endDate, customerId, status, rateCategory } = req.body ?? {};
  return {
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    customerId: customerId as string | undefined,
    status: status as string | undefined,
    rateCategory: rateCategory as string | undefined,
  };
}

export const previewReportTemplate = async (req: Request, res: Response) => {
  try {
    const template = await prisma.reportTemplate.findFirst({ where: { id: req.params.id as string, deletedAt: null } });
    if (!template) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report template not found' } });
    }
    const rows = await fetchTripRows(filtersFromBody(req));
    res.json({ success: true, data: { total: rows.length, rows: rows.slice(0, 50) } });
  } catch (error) {
    logger.error({ err: error }, 'Preview report template error:');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to preview report template' } });
  }
};

export const generateReportTemplate = async (req: Request, res: Response) => {
  try {
    const template = await prisma.reportTemplate.findFirst({ where: { id: req.params.id as string, deletedAt: null } });
    if (!template) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report template not found' } });
    }

    const rows = await fetchTripRows(filtersFromBody(req));
    const layout = template.layout as unknown as TemplateLayout;
    const tokens = typeof req.body?.tokens === 'object' ? req.body.tokens : undefined;

    const buffer = generateFromTemplate(Buffer.from(template.file_data), layout, rows, { tokens });

    const safeName = template.name.replace(/[^a-zA-Z0-9_-]+/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_report.xlsx"`);
    res.send(buffer);
  } catch (error) {
    logger.error({ err: error }, 'Generate report template error:');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to generate report' } });
  }
};
