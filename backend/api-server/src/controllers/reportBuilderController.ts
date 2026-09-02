import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { prisma } from '../db';
import { REPORT_SCHEMA } from '../reportEngine/schema';
import { runReportQuery, ReportEngineError } from '../reportEngine/resolver';

export const getReportSchema = async (_req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: REPORT_SCHEMA });
};

export const executeReportQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await runReportQuery(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err instanceof ReportEngineError) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUERY', message: err.message },
      });
      return;
    }
    logger.error('Report engine query failed:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to execute report query' },
    });
  }
};

export const listSavedReports = async (_req: Request, res: Response): Promise<void> => {
  try {
    const reports = await prisma.savedReport.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: reports });
  } catch (err: any) {
    logger.error('Failed to list saved reports:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const createSavedReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, spec, visualization, isTemplate } = req.body;
    const userId = (req as any).user?.id;
    const report = await prisma.savedReport.create({
      data: {
        name,
        category: category || 'Custom',
        spec,
        visualization: visualization || 'table',
        isTemplate: !!isTemplate,
        created_by: userId || null,
      },
    });
    res.status(201).json({ success: true, data: report });
  } catch (err: any) {
    logger.error('Failed to create saved report:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const deleteSavedReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.savedReport.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    res.json({ success: true, data: { id } });
  } catch (err: any) {
    logger.error('Failed to delete saved report:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const listScheduledReports = async (_req: Request, res: Response): Promise<void> => {
  try {
    const schedules = await prisma.scheduledReport.findMany({
      where: { deletedAt: null },
      include: { savedReport: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: schedules });
  } catch (err: any) {
    logger.error('Failed to list scheduled reports:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const createScheduledReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { savedReportId, frequency, dayOfMonth, time, recipients, delivery, isActive } = req.body;
    const userId = (req as any).user?.id;
    const schedule = await prisma.scheduledReport.create({
      data: {
        savedReportId,
        frequency,
        dayOfMonth: dayOfMonth ? Number(dayOfMonth) : null,
        time: time || '08:00',
        recipients: recipients || [],
        delivery: delivery || ['email'],
        isActive: isActive ?? true,
        created_by: userId || null,
      },
      include: { savedReport: true },
    });
    res.status(201).json({ success: true, data: schedule });
  } catch (err: any) {
    logger.error('Failed to create scheduled report:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const updateScheduledReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const data = req.body;
    const schedule = await prisma.scheduledReport.update({
      where: { id },
      data,
      include: { savedReport: true },
    });
    res.json({ success: true, data: schedule });
  } catch (err: any) {
    logger.error('Failed to update scheduled report:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const deleteScheduledReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.scheduledReport.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    res.json({ success: true, data: { id } });
  } catch (err: any) {
    logger.error('Failed to delete scheduled report:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
