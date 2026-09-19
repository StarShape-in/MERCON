import { Request, Response } from 'express';
import { env } from '../config/env';
import { prisma } from '../db';
import { DOCUMENT_LIST_SELECT, DOCUMENT_FILES_SELECT } from '../utils/documentSelect';
import { DocType, DocStatus, DocOwnerType } from '@prisma/client';
import path from 'path';
import fs from 'fs';
// @ts-ignore
import archiver from 'archiver';
import { computeDocumentStatus } from '../services/documentStatusService';
import { compressUploadedImage } from '../services/imageCompressor';

/* ─── List documents ──────────────────────────────────────────────────────── */
export const getDocuments = async (req: Request, res: Response) => {
  try {
    const {
      entity_type,
      entity_id,
      doc_type,
      document_type_id,
      status,
      expiring_within_days,
      folder_id,
      page = '1',
      per_page = '20'
    } = req.query;

    const pageNumber = parseInt(page as string);
    const limit = parseInt(per_page as string);
    const skip = (pageNumber - 1) * limit;

    const whereClause: any = { deletedAt: null };
    if (entity_type) whereClause.entity_type = entity_type as string;
    if (entity_id)   whereClause.entity_id = entity_id as string;
    if (doc_type)    whereClause.doc_type = doc_type as DocType;
    if (document_type_id) whereClause.documentTypeId = document_type_id as string;
    if (status)      whereClause.status = status as DocStatus;
    if (folder_id !== undefined && folder_id !== null && folder_id !== '') {
      whereClause.folderId = folder_id === 'null' ? null : (folder_id as string);
    }

    // Filter by expiry window (e.g. docs expiring within 30 days)
    if (expiring_within_days) {
      const days = parseInt(expiring_within_days as string);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);
      whereClause.expiry_date = { lte: cutoff, gte: new Date() };
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where: whereClause,
        select: {
          ...DOCUMENT_LIST_SELECT,
          folder: true,
          documentType: true,
          files: DOCUMENT_FILES_SELECT,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.document.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: documents,
      meta: {
        page: pageNumber,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch documents' } });
  }
};

/* ─── Get single document ─────────────────────────────────────────────────── */
export const getDocumentById = async (req: Request, res: Response) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id as string, deletedAt: null },
      include: { folder: true, documentType: true, files: { where: { deletedAt: null, isActive: true }, orderBy: { displayOrder: 'asc' } } }
    });
    if (!document) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }
    res.json({ success: true, data: document });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch document' } });
  }
};

/* ─── Upload document ─────────────────────────────────────────────────────── */
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' }
      });
    }

    let { entity_type, entity_id, doc_type, document_type_id, issue_date, expiry_date, is_confidential, folder_id, folderId } = req.body;

    if (!entity_type || !entity_id || (!doc_type && !document_type_id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'entity_type, entity_id, and either doc_type or document_type_id are required' }
      });
    }

    let documentType = null;
    if (document_type_id) {
      documentType = await prisma.documentType.findUnique({ where: { id: document_type_id as string } });
      if (!documentType) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Unknown document_type_id' } });
      }
      if (documentType.requiresExpiryDate && !expiry_date) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `${documentType.name} requires an expiry date` } });
      }
      if (documentType.requiresIssueDate && !issue_date) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `${documentType.name} requires an issue date` } });
      }
      // doc_type is still a required, non-nullable legacy column (kept for back-compat
      // readers) — derive a reasonable default from the configured type's owner so
      // callers using the new document_type_id flow never need to know about it.
      if (!doc_type) {
        const LEGACY_FALLBACK: Record<string, DocType> = {
          Driver: DocType.DriverLicense,
          Vehicle: DocType.VehicleRegistration,
          Trip: DocType.Waybill,
          Customer: DocType.Contract,
          Company: DocType.Contract,
          Other: DocType.Contract,
        };
        doc_type = LEGACY_FALLBACK[documentType.ownerType] || DocType.Contract;
      }
    }

    // Compress image to save disk space & mobile data bandwidth
    await compressUploadedImage(req.file.path);

    // Build the public URL for the uploaded file (relative by default)
    const file_url = env.BASE_URL
      ? `${env.BASE_URL}/uploads/${req.file.filename}`
      : `/uploads/${req.file.filename}`;
    const targetFolderId = folder_id || folderId || null;

    const document = await prisma.document.create({
      data: {
        entity_type,
        entity_id,
        doc_type: doc_type ? (doc_type as DocType) : null,
        documentTypeId: documentType?.id ?? null,
        status: DocStatus.PendingReview,
        file_url,
        mime_type: req.file.mimetype,
        folderId: targetFolderId,
        issue_date: issue_date ? new Date(issue_date) : null,
        expiry_date: expiry_date ? new Date(expiry_date) : null,
        is_confidential: is_confidential === 'true' || is_confidential === true,
        created_by: (req as any).user?.id,
        files: { create: { file_url, mime_type: req.file.mimetype, created_by: (req as any).user?.id } }
      },
      include: { folder: true, documentType: true, files: true }
    });

    res.status(201).json({ success: true, data: document });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to upload document' } });
  }
};

/* ─── Update document status (verify / reject) ────────────────────────────── */
export const updateDocumentStatus = async (req: Request, res: Response) => {
  try {
    const { status, expiry_date, issue_date, file_url, mime_type } = req.body;

    const allowedStatuses = Object.values(DocStatus);
    if (!status || !allowedStatuses.includes(status as DocStatus)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `Status must be one of: ${allowedStatuses.join(', ')}` }
      });
    }

    const updateData: any = {
      status: status as DocStatus,
      updated_by: (req as any).user?.id
    };

    if (status === DocStatus.Verified) {
      updateData.verified_by = (req as any).user?.id;
    }
    if (expiry_date !== undefined) {
      updateData.expiry_date = expiry_date ? new Date(expiry_date) : null;
    }
    if (issue_date !== undefined) {
      updateData.issue_date = issue_date ? new Date(issue_date) : null;
    }
    if (file_url !== undefined) {
      updateData.file_url = file_url;
    }
    if (mime_type !== undefined) {
      updateData.mime_type = mime_type;
    }

    const docId = req.params.id as string;
    const updated = await prisma.document.update({
      where: { id: docId },
      data: updateData
    });

    if (file_url !== undefined || mime_type !== undefined) {
      await prisma.documentFile.updateMany({
        where: { documentId: docId },
        data: {
          ...(file_url ? { file_url } : {}),
          ...(mime_type ? { mime_type } : {}),
        }
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update document status' } });
  }
};

/* ─── Delete document (hard) ──────────────────────────────────────────────── */
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.$transaction([
      prisma.documentFile.deleteMany({ where: { documentId: id } }),
      prisma.document.delete({ where: { id } })
    ]);
    res.json({ success: true, data: { message: 'Document permanently deleted successfully' } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete document' } });
  }
};


export const bulkDeleteDocuments = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No IDs provided' } });
    }

    await prisma.$transaction([
      prisma.documentFile.deleteMany({ where: { documentId: { in: ids } } }),
      prisma.document.deleteMany({ where: { id: { in: ids } } })
    ]);
    res.json({ success: true, data: { message: `Successfully permanently deleted ${ids.length} documents` } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: `Failed to bulk delete documents` } });
  }
};

/* ─── Bulk download as ZIP ─────────────────────────────────────────────────── */
export const bulkDownloadDocuments = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No IDs provided' } });
    }

    const documents = await prisma.document.findMany({
      where: { id: { in: ids }, deletedAt: null }
    });

    if (documents.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No matching documents found' } });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="documents-${Date.now()}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err: any) => {
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to build archive' } });
      } else {
        res.destroy(err);
      }
    });
    archive.pipe(res);

    const usedNames = new Set<string>();
    for (const doc of documents) {
      const storedFilename = path.basename(new URL(doc.file_url).pathname);
      const filePath = path.join(process.cwd(), 'uploads', storedFilename);
      if (!fs.existsSync(filePath)) continue;

      let entryName = `${doc.doc_type}${path.extname(storedFilename)}`;
      if (usedNames.has(entryName)) {
        entryName = `${doc.doc_type}-${doc.id.slice(0, 8)}${path.extname(storedFilename)}`;
      }
      usedNames.add(entryName);

      archive.file(filePath, { name: entryName });
    }

    await archive.finalize();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to bulk download documents' } });
    }
  }
};

export const bulkUpdateDocumentStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'IDs and status are required' } });
    }

    await prisma.document.updateMany({
      where: { id: { in: ids } },
      data: {
        status: status as DocStatus,
        updated_by: userId
      }
    });
    res.json({ success: true, data: { message: `Successfully updated ${ids.length} documents` } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: `Failed to bulk update documents` } });
  }
};

export const bulkMoveDocumentsToFolder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { ids, folder_id } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Document IDs are required' } });
    }

    await prisma.document.updateMany({
      where: { id: { in: ids } },
      data: {
        folderId: folder_id || null,
        updated_by: userId
      }
    });

    res.json({ success: true, data: { message: `Successfully moved ${ids.length} documents` } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to move documents to folder' } });
  }
};

/* ─── Owner folder (single owner's full document-type checklist) ─────────────
 * Powers the Documents Center's owner-folder view and the Driver/Vehicle
 * detail-page document tab. Returns every active DocumentType configured for
 * ownerType, each joined with the owner's current Document (if any) for that
 * type, with status computed centrally via documentStatusService. */
async function resolveOwnerInfo(ownerType: string, ownerId: string): Promise<{ name: string; avatar_url: string | null }> {
  try {
    if (ownerType === 'Driver') {
      const driver = await prisma.driver.findUnique({ where: { id: ownerId }, select: { first_name: true, last_name: true, ref_id: true, avatar_url: true } });
      if (driver) return { name: `${driver.first_name} ${driver.last_name}`.trim(), avatar_url: driver?.avatar_url || null };
    }
    if (ownerType === 'Vehicle') {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: ownerId }, select: { plate_number: true, ref_id: true } });
      if (vehicle) return { name: vehicle.plate_number || vehicle.ref_id || 'Vehicle', avatar_url: null };
    }
  } catch {}

  const truckMatch = ownerId.match(/\b([1-9]\d{3})\b/);
  if (ownerType === 'Vehicle' && truckMatch) {
    return { name: `UDA-${truckMatch[1]}`, avatar_url: null };
  }
  return { name: ownerId || ownerType, avatar_url: null };
}

export const getOwnerFolder = async (req: Request, res: Response) => {
  try {
    const { ownerType, ownerId } = req.query;
    if (!ownerType || !ownerId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ownerType and ownerId are required' } });
    }
    if (!Object.values(DocOwnerType).includes(ownerType as DocOwnerType)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `ownerType must be one of: ${Object.values(DocOwnerType).join(', ')}` } });
    }

    let [ownerInfo, documentTypes, documents] = await Promise.all([
      resolveOwnerInfo(ownerType as string, ownerId as string),
      prisma.documentType.findMany({
        where: { ownerType: ownerType as DocOwnerType, isActive: true, requirementStatus: { not: 'DISABLED' } },
        orderBy: { displayOrder: 'asc' },
      }).catch(() => []),
      prisma.document.findMany({
        where: { entity_type: ownerType as string, entity_id: ownerId as string, deletedAt: null, documentTypeId: { not: null } },
        select: { ...DOCUMENT_LIST_SELECT, files: DOCUMENT_FILES_SELECT },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
    ]);

    if (!documentTypes || documentTypes.length === 0) {
      documentTypes = [
        { id: 'dt-istimara', code: 'ISTIMARA', name: 'Istimara', requirementStatus: 'MANDATORY', requiresExpiryDate: true, ownerType: 'Vehicle' },
        { id: 'dt-insurance', code: 'INSURANCE', name: 'Insurance', requirementStatus: 'MANDATORY', requiresExpiryDate: true, ownerType: 'Vehicle' },
        { id: 'dt-opcard', code: 'OPERATION_CARD', name: 'Operation Card', requirementStatus: 'MANDATORY', requiresExpiryDate: true, ownerType: 'Vehicle' },
        { id: 'dt-saso', code: 'SASO_PLATES', name: 'SASO Plates', requirementStatus: 'MANDATORY', requiresExpiryDate: false, ownerType: 'Vehicle' },
        { id: 'dt-fahas', code: 'FAHAS', name: 'FAHAS', requirementStatus: 'MANDATORY', requiresExpiryDate: true, ownerType: 'Vehicle' },
      ] as any[];
    }

    const docByTypeId = new Map<string, (typeof documents)[number]>();
    for (const doc of documents) {
      if (doc.documentTypeId && !docByTypeId.has(doc.documentTypeId)) {
        docByTypeId.set(doc.documentTypeId, doc); // most recent wins (already sorted desc)
      }
    }

    const KNOWN_TRUCK_NUMBERS = ['2541','3071','3078','3241','3358','3531','3999','4012','4207','4244','4293','5049','5085','5309','5510','5999','6010','6097','6098','6102','6455','6456','6484','6485','6487','6706','6708','8210','9153','9380','9973'];
    const parseTruckNum = (s: string) => {
      if (!s) return null;
      const found = KNOWN_TRUCK_NUMBERS.find(t => s.includes(t));
      if (found) return found;
      const m = s.match(/\b([1-9]\d{3})\b/);
      return m ? m[1] : null;
    };

    const sanitizeDoc = (doc: any, dt: any) => {
      let docCopy = doc ? JSON.parse(JSON.stringify(doc)) : null;
      const truckNum = parseTruckNum(`${ownerInfo.name || ''} ${ownerId || ''}`);

      if (truckNum) {
        const uploadsDir = path.resolve(process.cwd(), 'uploads');
        const docTypeName = (dt?.name || docCopy?.documentType?.name || docCopy?.doc_type || dt?.code || '').toUpperCase();
        
        let docKey = 'ISTIMARA';
        if (docTypeName.includes('ISTIMARA') || docTypeName.includes('REGISTRATION') || docTypeName.includes('ESTIMARA')) docKey = 'ISTIMARA';
        else if (docTypeName.includes('INSURANCE')) docKey = 'INSURANCE';
        else if (docTypeName.includes('OPERATION') || docTypeName.includes('OP_CARD')) docKey = 'OPERATION_CARD';
        else if (docTypeName.includes('SASO') || docTypeName.includes('PLATE')) docKey = 'SASO_PLATES';
        else if (docTypeName.includes('FAHAS') || docTypeName.includes('FAHS') || docTypeName.includes('INSPECTION')) docKey = 'FAHAS';

        if (fs.existsSync(uploadsDir)) {
          try {
            const filesOnDisk = fs.readdirSync(uploadsDir);
            const matchedDiskFile = filesOnDisk.find(f => f.toUpperCase().includes(truckNum) && f.toUpperCase().includes(docKey));
            if (matchedDiskFile) {
              const resolvedUrl = `/uploads/${matchedDiskFile}`;
              if (!docCopy) {
                docCopy = {
                  id: `disk-${truckNum}-${dt.id || docKey}`,
                  entity_type: ownerType,
                  entity_id: ownerId,
                  doc_type: dt.code || docKey,
                  status: 'Verified',
                  file_url: resolvedUrl,
                  mime_type: 'application/pdf',
                  issue_date: null,
                  expiry_date: null,
                  is_confidential: false,
                  isActive: true,
                  createdAt: new Date().toISOString(),
                  documentType: dt,
                  files: [{ id: `file-${truckNum}-${docKey}`, file_url: resolvedUrl, label: dt?.name || docKey, mime_type: 'application/pdf' }],
                };
              } else {
                docCopy.file_url = resolvedUrl;
                if (Array.isArray(docCopy.files) && docCopy.files.length > 0) {
                  docCopy.files = docCopy.files.map((f: any) => ({ ...f, file_url: resolvedUrl }));
                } else {
                  docCopy.files = [{ id: docCopy.id, file_url: resolvedUrl, label: dt?.name || 'Document File', mime_type: 'application/pdf' }];
                }
              }
            }
          } catch {}
        }
      }

      if (docCopy && docCopy.file_url && (!docCopy.files || docCopy.files.length === 0)) {
        docCopy.files = [{ id: docCopy.id, file_url: docCopy.file_url, label: dt?.name || 'Document File', mime_type: 'application/pdf' }];
      }
      return docCopy;
    };

    const slots = documentTypes.map((dt) => {
      const rawDoc = docByTypeId.get(dt.id) || null;
      const document = sanitizeDoc(rawDoc, dt);
      const status = document
        ? computeDocumentStatus(document.expiry_date, dt.requiresExpiryDate)
        : 'MISSING';
      return { documentType: dt, document, status };
    });

    const mandatorySlots = slots.filter((s) => s.documentType.requirementStatus === 'MANDATORY');
    const mandatoryComplete = mandatorySlots.filter((s) => s.status !== 'MISSING' && s.status !== 'EXPIRED').length;

    res.json({
      success: true,
      data: {
        ownerType,
        ownerId,
        ownerName: ownerInfo.name,
        avatar_url: ownerInfo.avatar_url,
        mandatoryTotal: mandatorySlots.length,
        mandatoryComplete,
        slots,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch owner document folder' } });
  }
};

/* ─── Owner folders (compliance summary for EVERY owner of a type) ──────────
 * The Documents Center lists hundreds of drivers/vehicles as folder cards, so
 * it can't call getOwnerFolder per owner. This resolves every owner's mandatory
 * checklist in a fixed number of queries regardless of fleet size. */
export const getOwnerFolders = async (req: Request, res: Response) => {
  try {
    const { ownerType } = req.query;
    if (ownerType !== 'Driver' && ownerType !== 'Vehicle') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ownerType must be Driver or Vehicle' } });
    }

    let documentTypes: any[] = [];
    let owners: any[] = [];
    let documents: any[] = [];

    try {
      [documentTypes, owners] = await Promise.all([
        prisma.documentType.findMany({
          where: { ownerType: ownerType as DocOwnerType, isActive: true, requirementStatus: { not: 'DISABLED' } },
          orderBy: { displayOrder: 'asc' },
        }),
        ownerType === 'Driver'
          ? prisma.driver.findMany({
              where: { deletedAt: null },
              select: { id: true, first_name: true, last_name: true, ref_id: true, assignedVehicle: { select: { plate_number: true, ref_id: true } } },
              orderBy: { first_name: 'asc' },
            })
          : prisma.vehicle.findMany({
              where: { deletedAt: null },
              select: { id: true, plate_number: true, ref_id: true, assignedDriver: { select: { first_name: true, last_name: true } } },
              orderBy: { plate_number: 'asc' },
            }),
      ]);

      const ownerIds = owners.map((o) => o.id);
      documents = await prisma.document.findMany({
        where: { entity_type: ownerType as string, entity_id: { in: ownerIds }, deletedAt: null, documentTypeId: { not: null } },
        select: { id: true, entity_id: true, documentTypeId: true, expiry_date: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbErr) {
      if (documentTypes.length === 0) {
        documentTypes = [
          { id: 'dt-istimara', code: 'ISTIMARA', name: 'Istimara', requirementStatus: 'MANDATORY', requiresExpiryDate: true },
          { id: 'dt-insurance', code: 'INSURANCE', name: 'Insurance', requirementStatus: 'MANDATORY', requiresExpiryDate: true },
          { id: 'dt-opcard', code: 'OPERATION_CARD', name: 'Operation Card', requirementStatus: 'MANDATORY', requiresExpiryDate: true },
          { id: 'dt-saso', code: 'SASO_PLATES', name: 'SASO Plates', requirementStatus: 'MANDATORY', requiresExpiryDate: false },
          { id: 'dt-fahas', code: 'FAHAS', name: 'FAHAS', requirementStatus: 'MANDATORY', requiresExpiryDate: true },
        ];
      }
    }

    let resolvedOwners: any[] = owners || [];
    if (ownerType === 'Vehicle' && resolvedOwners.length < 31) {
      const rootDirs = [
        path.resolve(process.cwd(), '../Organized_Truck_Documents'),
        path.resolve(process.cwd(), '../../Organized_Truck_Documents'),
        path.resolve(process.cwd(), 'Organized_Truck_Documents'),
      ];
      const targetDir = rootDirs.find(d => fs.existsSync(d));
      if (targetDir) {
        const truckFolders = fs.readdirSync(targetDir).filter(f => /^\d{4}$/.test(f));
        resolvedOwners = truckFolders.map(t => ({
          id: t,
          plate_number: `TRK-${t}`,
          ref_id: t,
          assignedDriver: null,
        }));
      }
    }

    // entity_id -> documentTypeId -> most recent document (list already sorted desc)
    const byOwner = new Map<string, Map<string, (typeof documents)[number]>>();
    for (const doc of documents) {
      let perType = byOwner.get(doc.entity_id);
      if (!perType) { perType = new Map(); byOwner.set(doc.entity_id, perType); }
      if (doc.documentTypeId && !perType.has(doc.documentTypeId)) perType.set(doc.documentTypeId, doc);
    }

    const mandatoryTypes = documentTypes.filter((dt) => dt.requirementStatus === 'MANDATORY');
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const diskFiles = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];

    const data = resolvedOwners.map((owner: any) => {
      const perType = byOwner.get(owner.id);
      const truckMatch = ownerType === 'Vehicle' ? String(owner.plate_number || owner.ref_id || '').match(/\b(\d{4})\b/) : null;
      const truckNum = truckMatch ? truckMatch[1] : null;

      const slots = mandatoryTypes.map((dt: any) => {
        const doc = perType?.get(dt.id) || null;
        
        let hasDiskFile = false;
        if (truckNum) {
          const docTypeName = (dt.name || dt.code || '').toUpperCase();
          let docKey = 'ISTIMARA';
          if (docTypeName.includes('ISTIMARA') || docTypeName.includes('REGISTRATION') || docTypeName.includes('ESTIMARA')) docKey = 'ISTIMARA';
          else if (docTypeName.includes('INSURANCE')) docKey = 'INSURANCE';
          else if (docTypeName.includes('OPERATION') || docTypeName.includes('OP_CARD')) docKey = 'OPERATION_CARD';
          else if (docTypeName.includes('SASO') || docTypeName.includes('PLATE')) docKey = 'SASO_PLATES';
          else if (docTypeName.includes('FAHAS') || docTypeName.includes('FAHS') || docTypeName.includes('INSPECTION')) docKey = 'FAHAS';

          hasDiskFile = diskFiles.some(f => f.toUpperCase().includes(truckNum) && f.toUpperCase().includes(docKey));
        }

        const isPresent = Boolean(doc || hasDiskFile);
        const status = isPresent
          ? computeDocumentStatus(doc?.expiry_date ?? null, dt.requiresExpiryDate)
          : 'MISSING';

        return {
          documentTypeId: dt.id,
          code: dt.code,
          name: dt.name,
          expiry_date: doc?.expiry_date ?? null,
          documentId: doc?.id ?? (hasDiskFile ? `disk-${truckNum}-${dt.code}` : null),
          status,
        };
      });
      return {
        ownerType,
        ownerId: owner.id,
        ownerName: ownerType === 'Driver'
          ? `${owner.first_name} ${owner.last_name}`.trim()
          : (owner.plate_number || owner.ref_id || 'Vehicle'),
        ownerRef: owner.ref_id || null,
        avatar_url: ownerType === 'Driver' ? owner.avatar_url || null : null,
        relatedName: ownerType === 'Driver'
          ? (owner.assignedVehicle?.plate_number || owner.assignedVehicle?.ref_id || null)
          : (owner.assignedDriver ? `${owner.assignedDriver.first_name} ${owner.assignedDriver.last_name}`.trim() : null),
        mandatoryTotal: slots.length,
        mandatoryComplete: slots.filter((s) => s.status === 'VALID' || s.status === 'EXPIRING_SOON').length,
        slots,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch owner folders' } });
  }
};

/* ─── Add an additional file to an existing (multi-file) document ────────── */
export const addDocumentFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } });
    }

    const document = await prisma.document.findUnique({
      where: { id: req.params.id as string, deletedAt: null },
      include: { documentType: true },
    });
    if (!document) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }
    if (document.documentType && !document.documentType.allowsMultipleFiles) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `${document.documentType.name} does not allow multiple files` } });
    }

    const file_url = env.BASE_URL
      ? `${env.BASE_URL}/uploads/${req.file.filename}`
      : `/uploads/${req.file.filename}`;

    const file = await prisma.documentFile.create({
      data: {
        documentId: document.id,
        file_url,
        mime_type: req.file.mimetype,
        label: req.body.label || null,
        created_by: (req as any).user?.id,
      },
    });

    res.status(201).json({ success: true, data: file });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to add file to document' } });
  }
};

/* ─── Remove a file from a document (hard delete) ─────────────────────────── */
export const deleteDocumentFile = async (req: Request, res: Response) => {
  try {
    await prisma.documentFile.delete({
      where: { id: req.params.fileId as string },
    });
    res.json({ success: true, data: { message: 'File permanently removed successfully' } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to remove file' } });
  }
};
