import { Request, Response } from 'express';
import { prisma } from '../db';

/* ─── List Folders ───────────────────────────────────────────────────────── */
export const getFolders = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const whereClause: any = { deletedAt: null, isActive: true };
    if (category) {
      whereClause.category = category as string;
    }

    const folders = await prisma.folder.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { documents: { where: { deletedAt: null } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: folders.map(f => ({
        ...f,
        document_count: f._count.documents
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch folders' }
    });
  }
};

/* ─── Create Folder ──────────────────────────────────────────────────────── */
export const createFolder = async (req: Request, res: Response) => {
  try {
    const { name, category, description, color } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Folder name is required' }
      });
    }

    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        category: category || 'General',
        description: description ? description.trim() : null,
        color: color || '#E8450F',
        created_by: (req as any).user?.id
      }
    });

    res.status(201).json({ success: true, data: folder });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create folder' }
    });
  }
};

/* ─── Update Folder ──────────────────────────────────────────────────────── */
export const updateFolder = async (req: Request, res: Response) => {
  try {
    const { name, category, description, color } = req.body;

    const folder = await prisma.folder.update({
      where: { id: req.params.id as string },
      data: {
        name: name ? name.trim() : undefined,
        category: category !== undefined ? category : undefined,
        description: description !== undefined ? description : undefined,
        color: color !== undefined ? color : undefined,
        updated_by: (req as any).user?.id
      }
    });

    res.json({ success: true, data: folder });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update folder' }
    });
  }
};

/* ─── Delete Folder ──────────────────────────────────────────────────────── */
export const deleteFolder = async (req: Request, res: Response) => {
  try {
    const folderId = req.params.id as string;
    const userId = (req as any).user?.id;

    await prisma.$transaction([
      prisma.document.updateMany({ where: { folderId }, data: { folderId: null } }),
      prisma.folder.delete({ where: { id: folderId } })
    ]);

    res.json({ success: true, data: { message: 'Folder permanently deleted successfully' } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete folder' }
    });
  }
};
