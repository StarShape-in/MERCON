import { Request, Response } from 'express';
import { prisma } from '../index';
import { DocOwnerType, DocRequirement } from '@prisma/client';

/* ─── List document types ─────────────────────────────────────────────────── */
export const getDocumentTypes = async (req: Request, res: Response) => {
  try {
    const { ownerType, isActive } = req.query;
    const whereClause: any = {};
    if (ownerType) whereClause.ownerType = ownerType as DocOwnerType;
    if (isActive !== undefined) whereClause.isActive = isActive === 'true';

    const types = await prisma.documentType.findMany({
      where: whereClause,
      include: { _count: { select: { documents: true } } },
      orderBy: [{ ownerType: 'asc' }, { displayOrder: 'asc' }],
    });

    res.json({
      success: true,
      data: types.map((t) => ({ ...t, document_count: t._count.documents })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch document types' } });
  }
};

/* ─── Create document type ────────────────────────────────────────────────── */
export const createDocumentType = async (req: Request, res: Response) => {
  try {
    const {
      code, name, description, ownerType, requirementStatus,
      requiresIssueDate, requiresExpiryDate, allowsMultipleFiles, allowedFileTypes, displayOrder,
    } = req.body;

    if (!code || !name || !ownerType) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'code, name, and ownerType are required' },
      });
    }
    if (!Object.values(DocOwnerType).includes(ownerType)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `ownerType must be one of: ${Object.values(DocOwnerType).join(', ')}` },
      });
    }

    const docType = await prisma.documentType.create({
      data: {
        code: String(code).trim(),
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        ownerType: ownerType as DocOwnerType,
        requirementStatus: (requirementStatus as DocRequirement) || DocRequirement.OPTIONAL,
        requiresIssueDate: !!requiresIssueDate,
        requiresExpiryDate: requiresExpiryDate !== undefined ? !!requiresExpiryDate : true,
        allowsMultipleFiles: !!allowsMultipleFiles,
        allowedFileTypes: Array.isArray(allowedFileTypes) ? allowedFileTypes : [],
        displayOrder: displayOrder ?? 0,
        created_by: (req as any).user?.id,
      },
    });

    res.status(201).json({ success: true, data: docType });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'A document type with this code already exists' } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create document type' } });
  }
};

/* ─── Update document type ────────────────────────────────────────────────── */
export const updateDocumentType = async (req: Request, res: Response) => {
  try {
    const {
      name, description, requirementStatus, isActive,
      requiresIssueDate, requiresExpiryDate, allowsMultipleFiles, allowedFileTypes, displayOrder,
    } = req.body;

    const docType = await prisma.documentType.update({
      where: { id: req.params.id as string },
      data: {
        name: name !== undefined ? String(name).trim() : undefined,
        description: description !== undefined ? description : undefined,
        requirementStatus: requirementStatus !== undefined ? (requirementStatus as DocRequirement) : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined,
        requiresIssueDate: requiresIssueDate !== undefined ? !!requiresIssueDate : undefined,
        requiresExpiryDate: requiresExpiryDate !== undefined ? !!requiresExpiryDate : undefined,
        allowsMultipleFiles: allowsMultipleFiles !== undefined ? !!allowsMultipleFiles : undefined,
        allowedFileTypes: Array.isArray(allowedFileTypes) ? allowedFileTypes : undefined,
        displayOrder: displayOrder !== undefined ? displayOrder : undefined,
        updated_by: (req as any).user?.id,
      },
    });

    res.json({ success: true, data: docType });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update document type' } });
  }
};

/* ─── Delete document type (blocked if in use — disable instead) ─────────── */
export const deleteDocumentType = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const inUse = await prisma.document.count({ where: { documentTypeId: id, deletedAt: null } });

    if (inUse > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'IN_USE',
          message: `${inUse} document(s) use this type — disable it instead of deleting`,
        },
      });
    }

    await prisma.documentType.delete({ where: { id } });
    res.json({ success: true, data: { message: 'Document type deleted successfully' } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete document type' } });
  }
};
