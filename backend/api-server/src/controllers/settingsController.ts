import { Request, Response } from 'express';
import { prisma } from '../index';
import { MODULE_KEYS } from '@mercon/shared-types';

const SINGLETON_ID = 'singleton';

/** Used by trip creation to stamp carrier_name from this deployment's own name, not a hardcoded literal. */
export async function getCompanyLegalName(): Promise<string> {
  const settings = await getOrCreateSettings();
  return settings.companyLegalName;
}

/**
 * Single source of truth for "is module X on for this deployment" — used by
 * requireModuleEnabled and by controllers that need to filter cross-module
 * data (reports, trash, vehicle financials) rather than 403 outright.
 */
export async function getEnabledModules(): Promise<Set<string>> {
  const settings = await getOrCreateSettings();
  return new Set(settings.enabledModules);
}

// enabledModules defaults to every known module on first creation — this is
// the row's *only* creation path (also used by seed.ts's own upsert with the
// same default), so a deployment can never end up with an empty list simply
// because a request created the row before the seed ran. requireModuleEnabled
// fails closed on an empty list, so getting this default wrong 403s every
// gated module at once.
async function getOrCreateSettings() {
  return prisma.settings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID, enabledModules: [...MODULE_KEYS] },
  });
}

/* ─── Public branding — unauthenticated, so the login page can brand itself ── */
export const getPublicSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await getOrCreateSettings();
    return res.json({
      success: true,
      data: {
        appName: settings.appName,
        logoUrl: settings.logoUrl,
        primaryColor: settings.primaryColor,
        timezone: settings.timezone,
        defaultCountryCode: settings.defaultCountryCode,
        defaultCountryDialCode: settings.defaultCountryDialCode,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load settings' } });
  }
};

/* ─── Full settings — authenticated ─────────────────────────────────────────── */
export const getSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await getOrCreateSettings();
    return res.json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load settings' } });
  }
};

/* ─── Update settings — requireSuperAdmin gated ─────────────────────────────── */
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { appName, companyLegalName, logoUrl, primaryColor, timezone, defaultCountryCode, defaultCountryDialCode, enabledModules } = req.body;

    const data: Record<string, unknown> = {};
    if (appName !== undefined) data.appName = String(appName).trim();
    if (companyLegalName !== undefined) data.companyLegalName = String(companyLegalName).trim();
    if (logoUrl !== undefined) data.logoUrl = logoUrl ? String(logoUrl).trim() : null;
    if (primaryColor !== undefined) data.primaryColor = String(primaryColor).trim();
    if (timezone !== undefined) {
      if (typeof timezone !== 'string' || !timezone.trim()) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'timezone must be a non-empty string' } });
      }
      data.timezone = timezone.trim();
    }
    if (defaultCountryCode !== undefined) data.defaultCountryCode = String(defaultCountryCode).trim();
    if (defaultCountryDialCode !== undefined) data.defaultCountryDialCode = String(defaultCountryDialCode).trim();
    if (enabledModules !== undefined) {
      if (!Array.isArray(enabledModules) || !enabledModules.every((m) => typeof m === 'string')) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'enabledModules must be an array of strings' } });
      }
      data.enabledModules = enabledModules;
    }
    data.updated_by = userId;

    await getOrCreateSettings();
    const settings = await prisma.settings.update({ where: { id: SINGLETON_ID }, data });

    return res.json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update settings' } });
  }
};
