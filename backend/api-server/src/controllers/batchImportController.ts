import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db';
import { DocType, DocStatus, AssetType } from '@prisma/client';
import { env } from '../config/env';

/**
 * Classify document type based on Saudi transport keywords in filename.
 */
export function classifyDocType(filename: string): DocType {
  const upper = filename.toUpperCase();

  if (
    upper.includes('INSURANCE') ||
    upper.includes('TAMEEN') ||
    upper.includes('INURANCE')
  ) {
    return DocType.Insurance;
  }

  if (
    upper.includes('OPERATION CARD') ||
    upper.includes('OPEARTION CARD') ||
    upper.includes('AUTHORIZATION') ||
    upper.includes('AUTHARISATION') ||
    filename.includes('العقد') ||
    filename.includes('ترخيص') ||
    filename.includes('تفويض')
  ) {
    return DocType.Waybill;
  }

  if (upper.includes('CONTRACT') || upper.includes('AGREEMENT')) {
    return DocType.Contract;
  }

  // Istimara, Fahas, Plate certificates default to VehicleRegistration
  return DocType.VehicleRegistration;
}

/**
 * Infer MIME type from file extension.
 */
export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Core processor for importing a local folder structure of vehicle documents.
 */
export async function processLocalTrucksDocsFolder(basePath: string) {
  if (!fs.existsSync(basePath)) {
    throw new Error(`Directory does not exist at path: ${basePath}`);
  }

  const entries = fs.readdirSync(basePath);
  const subdirs = entries.filter((name) => {
    const full = path.join(basePath, name);
    return fs.statSync(full).isDirectory();
  });

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  let totalVehiclesProcessed = 0;
  let totalDocsCreated = 0;
  const resultsDetails: Array<{
    folder: string;
    vehicleId: string;
    vehiclePlate: string;
    docsCount: number;
    files: string[];
  }> = [];

  for (const folderName of subdirs) {
    const folderPath = path.join(basePath, folderName);
    const files = fs.readdirSync(folderPath);

    // Clean folder identifier (e.g., "2541")
    const cleanId = folderName.trim();
    if (!cleanId) continue;

    // Search for existing vehicle by plate_number or ref_id containing cleanId
    let vehicle = await prisma.vehicle.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { plate_number: { contains: cleanId, mode: 'insensitive' } },
          { ref_id: { contains: cleanId, mode: 'insensitive' } },
        ],
      },
    });

    // Auto-create vehicle if not existing
    if (!vehicle) {
      const uniqueRef = `VEH-${cleanId}-${Date.now().toString().slice(-4)}`;
      vehicle = await prisma.vehicle.create({
        data: {
          plate_number: cleanId,
          ref_id: uniqueRef,
          asset_type: AssetType.Flatbed,
          status: 'Available',
          capacity_kg: 20000,
        },
      });
    }

    let createdForVehicle = 0;
    const createdFileNames: string[] = [];

    for (const fileName of files) {
      const srcFile = path.join(folderPath, fileName);
      const stat = fs.statSync(srcFile);

      // Skip subdirectories and archive files (.rar, .zip)
      if (stat.isDirectory()) continue;
      const ext = path.extname(fileName).toLowerCase();
      if (ext === '.rar' || ext === '.zip') continue;

      // Copy file to server /uploads directory
      const safeBaseName = path
        .basename(fileName, ext)
        .replace(/[^a-zA-Z0-9_\-\.\u0600-\u06FF]/g, '_');
      const uniqueFilename = `truck-${cleanId}-${Date.now()}-${Math.floor(
        Math.random() * 1000
      )}${ext}`;
      const destPath = path.join(uploadsDir, uniqueFilename);

      fs.copyFileSync(srcFile, destPath);

      const file_url = env.BASE_URL
        ? `${env.BASE_URL}/uploads/${uniqueFilename}`
        : `/uploads/${uniqueFilename}`;
      const doc_type = classifyDocType(fileName);
      const mime_type = getMimeType(fileName);

      await prisma.document.create({
        data: {
          entity_type: 'Vehicle',
          entity_id: vehicle.id,
          doc_type,
          status: DocStatus.Verified,
          file_url,
          mime_type,
          is_confidential: false,
        },
      });

      createdForVehicle++;
      totalDocsCreated++;
      createdFileNames.push(fileName);
    }

    totalVehiclesProcessed++;
    resultsDetails.push({
      folder: folderName,
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.plate_number,
      docsCount: createdForVehicle,
      files: createdFileNames,
    });
  }

  return {
    totalFoldersScanned: subdirs.length,
    totalVehiclesProcessed,
    totalDocsCreated,
    details: resultsDetails,
  };
}

/**
 * Controller endpoint to trigger local batch import.
 */
export const importLocalTrucksDocs = async (req: Request, res: Response) => {
  try {
    const targetPath =
      req.body.folderPath ||
      'C:\\Users\\ILAN\\Downloads\\Trucks Docs\\Trucks Docs';

    const summary = await processLocalTrucksDocsFolder(targetPath);

    res.json({
      success: true,
      data: summary,
      message: `Successfully imported ${summary.totalDocsCreated} documents across ${summary.totalVehiclesProcessed} vehicle folders.`,
    });
  } catch (error: any) {
    console.error('Failed batch truck docs import:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || 'Failed to process local truck documents folder',
      },
    });
  }
};
