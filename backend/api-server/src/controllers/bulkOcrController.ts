import { Request, Response } from 'express';
import { prisma } from '../db';
import { analyzeDocumentWithAI, getLocalFilePathFromUrl } from '../services/ocrService';
import { DocStatus } from '@prisma/client';

/**
 * Endpoint handler to trigger AI OCR extraction for a single document
 */
export const extractSingleDocumentOcr = async (req: Request, res: Response) => {
  try {
    const docId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const document = await prisma.document.findUnique({
      where: { id: docId },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found' },
      });
    }

    const localPath = getLocalFilePathFromUrl(document.file_url);
    if (!localPath) {
      return res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'Document file not found on server disk' },
      });
    }

    const ocrResult = await analyzeDocumentWithAI(localPath);

    const updateData: any = {
      doc_type: ocrResult.doc_type,
      status: DocStatus.Verified,
      ai_extracted_json: {
        document_number: ocrResult.document_number,
        vehicle_plate: ocrResult.vehicle_plate,
        issuing_authority: ocrResult.issuing_authority,
        confidence: ocrResult.confidence,
        notes: ocrResult.notes,
      },
    };

    if (ocrResult.expiry_date) {
      updateData.expiry_date = new Date(ocrResult.expiry_date);
    }
    if (ocrResult.issue_date) {
      updateData.issue_date = new Date(ocrResult.issue_date);
    }
    if (ocrResult.raw_text) {
      updateData.ocr_raw_text = ocrResult.raw_text;
    }

    const updatedDocument = await prisma.document.update({
      where: { id: docId },
      data: updateData,
    });

    res.json({
      success: true,
      data: {
        document: updatedDocument,
        ocr: ocrResult,
      },
      message: 'Successfully extracted document dates and metadata with AI OCR',
    });
  } catch (error: any) {
    console.error('Failed single document AI OCR:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'AI OCR extraction failed' },
    });
  }
};

/**
 * Endpoint handler to trigger bulk AI OCR extraction across all vehicle documents
 */
export const extractAllDocumentsOcr = async (req: Request, res: Response) => {
  try {
    const { ids, only_missing_expiry = true, limit = 200 } = req.body;

    const whereClause: any = { deletedAt: null };
    if (ids && Array.isArray(ids) && ids.length > 0) {
      whereClause.id = { in: ids };
    } else if (only_missing_expiry) {
      whereClause.expiry_date = null;
    }

    const documents = await prisma.document.findMany({
      where: whereClause,
      take: typeof limit === 'number' ? limit : 200,
      orderBy: { createdAt: 'desc' },
    });

    if (documents.length === 0) {
      return res.json({
        success: true,
        data: { totalProcessed: 0, totalUpdated: 0, details: [] },
        message: 'No documents requiring AI OCR date extraction',
      });
    }

    let totalUpdated = 0;
    const detailsResults: Array<{
      id: string;
      doc_type: string;
      expiry_date: string | null;
      document_number: string | null;
      status: string;
    }> = [];

    // Parallel batch processing with 5 concurrent workers
    const batchSize = 5;
    for (let i = 0; i < documents.length; i += batchSize) {
      const chunk = documents.slice(i, i + batchSize);
      await Promise.all(
        chunk.map(async (doc) => {
          const localPath = getLocalFilePathFromUrl(doc.file_url);
          if (!localPath) {
            detailsResults.push({
              id: doc.id,
              doc_type: doc.doc_type,
              expiry_date: null,
              document_number: null,
              status: 'File Not Found',
            });
            return;
          }

          try {
            const ocrResult = await analyzeDocumentWithAI(localPath);

            const updateData: any = {
              doc_type: ocrResult.doc_type,
              status: DocStatus.Verified,
              ai_extracted_json: {
                document_number: ocrResult.document_number,
                vehicle_plate: ocrResult.vehicle_plate,
                issuing_authority: ocrResult.issuing_authority,
                confidence: ocrResult.confidence,
                notes: ocrResult.notes,
              },
            };

            if (ocrResult.expiry_date) {
              updateData.expiry_date = new Date(ocrResult.expiry_date);
            }
            if (ocrResult.issue_date) {
              updateData.issue_date = new Date(ocrResult.issue_date);
            }
            if (ocrResult.raw_text) {
              updateData.ocr_raw_text = ocrResult.raw_text;
            }

            await prisma.document.update({
              where: { id: doc.id },
              data: updateData,
            });

            totalUpdated++;
            detailsResults.push({
              id: doc.id,
              doc_type: ocrResult.doc_type,
              expiry_date: ocrResult.expiry_date,
              document_number: ocrResult.document_number,
              status: 'Extracted & Updated',
            });
          } catch (err: any) {
            detailsResults.push({
              id: doc.id,
              doc_type: doc.doc_type,
              expiry_date: null,
              document_number: null,
              status: `Error: ${err.message}`,
            });
          }
        })
      );
    }

    res.json({
      success: true,
      data: {
        totalProcessed: documents.length,
        totalUpdated,
        details: detailsResults,
      },
      message: `Successfully analyzed ${documents.length} documents and updated ${totalUpdated} expiry dates with AI OCR!`,
    });
  } catch (error: any) {
    console.error('Failed bulk AI OCR extraction:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Bulk AI OCR extraction failed' },
    });
  }
};
