import { Request, Response } from 'express';
import path from 'path';
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

const isValidUuid = (str: string) => typeof str === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

/**
 * Endpoint to push extracted document metadata from local DB directly into Production DB
 */
export const syncLocalDocumentRecords = async (req: Request, res: Response) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'No records provided' });
    }

    let updated = 0;
    for (const rec of records) {
      const fileName = rec.file_url ? path.basename(rec.file_url) : '';
      const plate = rec.vehicle_plate ? String(rec.vehicle_plate).trim() : '';
      
      let matchingDoc = null;

      // 1. Try finding by UUID or filename
      const orConditions: any[] = [];
      if (isValidUuid(rec.id)) {
        orConditions.push({ id: rec.id });
      }
      if (fileName && fileName.length > 3) {
        orConditions.push({ file_url: { contains: fileName } });
      }

      if (orConditions.length > 0) {
        matchingDoc = await prisma.document.findFirst({
          where: { OR: orConditions },
        });
      }

      // 2. Fallback: match by Vehicle plate_number and doc_type
      if (!matchingDoc && plate) {
        const digits = plate.replace(/\D/g, '');
        const vehicle = await prisma.vehicle.findFirst({
          where: {
            OR: [
              { plate_number: { contains: plate, mode: 'insensitive' } },
              { ref_id: { contains: plate, mode: 'insensitive' } },
              ...(digits ? [
                { plate_number: { contains: digits } },
                { ref_id: { contains: digits } },
              ] : []),
            ],
          },
        });

        if (vehicle) {
          matchingDoc = await prisma.document.findFirst({
            where: {
              entity_id: vehicle.id,
              doc_type: rec.doc_type,
            },
          });

          // If no doc_type match, find any unverified document for vehicle
          if (!matchingDoc) {
            matchingDoc = await prisma.document.findFirst({
              where: {
                entity_id: vehicle.id,
                expiry_date: null,
              },
            });
          }
        }
      }

      if (matchingDoc) {
        await prisma.document.update({
          where: { id: matchingDoc.id },
          data: {
            doc_type: rec.doc_type || matchingDoc.doc_type,
            status: DocStatus.Verified,
            expiry_date: rec.expiry_date ? new Date(rec.expiry_date) : matchingDoc.expiry_date,
            issue_date: rec.issue_date ? new Date(rec.issue_date) : matchingDoc.issue_date,
            ai_extracted_json: rec.ai_extracted_json || matchingDoc.ai_extracted_json,
            ocr_raw_text: rec.ocr_raw_text || matchingDoc.ocr_raw_text,
          },
        });
        updated++;
      }
    }

    res.json({
      success: true,
      data: { totalReceived: records.length, updated },
      message: `Successfully synced ${updated}/${records.length} extracted records into Production Database!`,
    });
  } catch (err: any) {
    console.error('Failed syncLocalDocumentRecords:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
