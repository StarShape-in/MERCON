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
        extra_details: ocrResult.extra_details || null,
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
                extra_details: ocrResult.extra_details || null,
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

/**
 * Auto-match and link documents to existing Vehicles or Drivers based on
 * filenames, plate numbers, IQAMA/SSN, chassis #, or extracted AI JSON.
 */
export const autoAssignUnlinkedDocs = async (req: Request, res: Response) => {
  try {
    const allDocs = await prisma.document.findMany({
      where: { deletedAt: null },
    });

    const vehicles = await prisma.vehicle.findMany({
      where: { deletedAt: null },
      select: { id: true, plate_number: true, ref_id: true, trailer_number: true },
    });

    const drivers = await prisma.driver.findMany({
      where: { deletedAt: null },
      select: { id: true, first_name: true, last_name: true, license_number: true, phone_primary: true, ref_id: true },
    });

    const folders = await prisma.folder.findMany({
      where: { deletedAt: null },
    });

    let assignedCount = 0;
    const details: Array<{ docId: string; fileName: string; matchedEntity: string; entityType: string }> = [];

    for (const doc of allDocs) {
      const fileName = path.basename(doc.file_url || '');
      const rawText = (doc.ocr_raw_text || '').toLowerCase();
      const aiJson: any = doc.ai_extracted_json || {};
      const aiPlate = (aiJson.vehicle_plate || '').toString().toLowerCase();
      const aiDocNum = (aiJson.document_number || '').toString().toLowerCase();

      let matchedVehicle = null;

      // 1. Try Vehicle Match
      for (const v of vehicles) {
        const plateStr = (v.plate_number || '').toLowerCase().trim();
        const plateDigits = plateStr.replace(/\D/g, '');
        const refStr = (v.ref_id || '').toLowerCase().trim();
        const trailerStr = (v.trailer_number || '').toLowerCase().trim();

        // Check plate digits (e.g. "2541", "3071", "6708", "9973", "5510", "4244", "3531")
        if (plateDigits && plateDigits.length >= 3) {
          if (fileName.includes(plateDigits) || aiPlate.includes(plateDigits) || rawText.includes(plateDigits) || aiDocNum.includes(plateDigits)) {
            matchedVehicle = v;
            break;
          }
        }

        // Check plate string
        if (plateStr && (fileName.toLowerCase().includes(plateStr) || aiPlate.includes(plateStr))) {
          matchedVehicle = v;
          break;
        }

        // Check ref_id
        if (refStr && refStr.length >= 3 && (fileName.toLowerCase().includes(refStr) || rawText.includes(refStr))) {
          matchedVehicle = v;
          break;
        }

        // Check trailer_number
        if (trailerStr && trailerStr.length >= 3 && (fileName.toLowerCase().includes(trailerStr) || rawText.includes(trailerStr))) {
          matchedVehicle = v;
          break;
        }
      }

      if (matchedVehicle) {
        const vFolder = folders.find(
          (f) => f.category === 'Vehicles' && (f.name.includes(matchedVehicle.plate_number || '') || f.name.includes(matchedVehicle.ref_id || ''))
        ) || folders.find((f) => f.category === 'Vehicles');

        await prisma.document.update({
          where: { id: doc.id },
          data: {
            entity_type: 'Vehicle',
            entity_id: matchedVehicle.id,
            folderId: vFolder ? vFolder.id : doc.folderId,
          },
        });

        assignedCount++;
        details.push({
          docId: doc.id,
          fileName,
          matchedEntity: matchedVehicle.plate_number || matchedVehicle.ref_id || 'Vehicle',
          entityType: 'Vehicle',
        });
        continue;
      }

      // 2. Try Driver Match if not linked to a vehicle
      let matchedDriver = null;
      for (const d of drivers) {
        const license = (d.license_number || '').toString().trim();
        const refId = (d.ref_id || '').toString().trim().toLowerCase();
        const firstName = (d.first_name || '').toString().trim().toLowerCase();
        const lastName = (d.last_name || '').toString().trim().toLowerCase();

        if (license && license.length >= 5 && (rawText.includes(license) || fileName.includes(license) || aiDocNum.includes(license))) {
          matchedDriver = d;
          break;
        }

        if (refId && refId.length >= 3 && (fileName.toLowerCase().includes(refId) || rawText.includes(refId))) {
          matchedDriver = d;
          break;
        }

        if (firstName && firstName.length >= 3 && (fileName.toLowerCase().includes(firstName) || rawText.includes(firstName))) {
          matchedDriver = d;
          break;
        }
      }

      if (matchedDriver) {
        const dFolder = folders.find((f) => f.category === 'Drivers');

        await prisma.document.update({
          where: { id: doc.id },
          data: {
            entity_type: 'Driver',
            entity_id: matchedDriver.id,
            folderId: dFolder ? dFolder.id : doc.folderId,
          },
        });

        assignedCount++;
        details.push({
          docId: doc.id,
          fileName,
          matchedEntity: `${matchedDriver.first_name} ${matchedDriver.last_name}`.trim(),
          entityType: 'Driver',
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalDocs: allDocs.length,
        assignedCount,
        details,
      },
      message: `⚡ Auto-assigned ${assignedCount} documents to matching Vehicles & Drivers!`,
    });
  } catch (error: any) {
    console.error('Failed autoAssignUnlinkedDocs:', error);
    res.status(500).json({ success: false, message: error.message || 'Auto-assign failed' });
  }
};

/**
 * Generate proposed auto-assignments for unassigned documents.
 * Returns proposed matches with confidence ratings and reasoning for interactive approval.
 */
export const previewAutoAssignUnlinkedDocs = async (req: Request, res: Response) => {
  try {
    const allDocs = await prisma.document.findMany({
      where: { deletedAt: null },
    });

    const vehicles = await prisma.vehicle.findMany({
      where: { deletedAt: null },
      select: { id: true, plate_number: true, ref_id: true, trailer_number: true },
    });

    const drivers = await prisma.driver.findMany({
      where: { deletedAt: null },
      select: { id: true, first_name: true, last_name: true, license_number: true, phone_primary: true, ref_id: true },
    });

    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
    const driverMap = new Map(drivers.map((d) => [d.id, d]));

    const proposals: Array<{
      docId: string;
      fileName: string;
      docType: string;
      fileUrl: string;
      entityType: string;
      entityId: string;
      proposedType: 'Vehicle' | 'Driver' | null;
      proposedId: string | null;
      proposedName: string | null;
      confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
      matchReason: string;
    }> = [];

    for (const doc of allDocs) {
      const fileName = path.basename(doc.file_url || '');
      const rawText = (doc.ocr_raw_text || '').toLowerCase();
      const aiJson: any = doc.ai_extracted_json || {};
      const aiPlate = (aiJson.vehicle_plate || '').toString().toLowerCase();
      const aiDocNum = (aiJson.document_number || '').toString().toLowerCase();

      let proposedType: 'Vehicle' | 'Driver' | null = null;
      let proposedId: string | null = null;
      let proposedName: string | null = null;
      let confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' = 'NONE';
      let matchReason = 'No automatic match found';

      // 1. Try Vehicle Match
      for (const v of vehicles) {
        const plateStr = (v.plate_number || '').toLowerCase().trim();
        const plateDigits = plateStr.replace(/\D/g, '');
        const refStr = (v.ref_id || '').toLowerCase().trim();
        const trailerStr = (v.trailer_number || '').toLowerCase().trim();

        // Check plate digits (e.g. "2541", "3071", "6708", "9973", "5510", "4244", "3531")
        if (plateDigits && plateDigits.length >= 3) {
          if (fileName.includes(plateDigits) || aiPlate.includes(plateDigits) || aiDocNum.includes(plateDigits)) {
            proposedType = 'Vehicle';
            proposedId = v.id;
            proposedName = v.plate_number || v.ref_id || 'Vehicle';
            confidence = 'HIGH';
            matchReason = `Matched plate number digits '${plateDigits}' in filename / AI text`;
            break;
          } else if (rawText.includes(plateDigits)) {
            proposedType = 'Vehicle';
            proposedId = v.id;
            proposedName = v.plate_number || v.ref_id || 'Vehicle';
            confidence = 'MEDIUM';
            matchReason = `Matched plate number digits '${plateDigits}' inside raw OCR body text`;
            break;
          }
        }

        // Check plate string
        if (plateStr && (fileName.toLowerCase().includes(plateStr) || aiPlate.includes(plateStr))) {
          proposedType = 'Vehicle';
          proposedId = v.id;
          proposedName = v.plate_number || v.ref_id || 'Vehicle';
          confidence = 'HIGH';
          matchReason = `Exact match for vehicle plate '${v.plate_number}'`;
          break;
        }

        // Check ref_id
        if (refStr && refStr.length >= 3 && (fileName.toLowerCase().includes(refStr) || rawText.includes(refStr))) {
          proposedType = 'Vehicle';
          proposedId = v.id;
          proposedName = v.plate_number || v.ref_id || 'Vehicle';
          confidence = 'MEDIUM';
          matchReason = `Matched vehicle reference ID '${v.ref_id}'`;
          break;
        }
      }

      // 2. Try Driver Match if no vehicle match
      if (!proposedId) {
        for (const d of drivers) {
          const license = (d.license_number || '').toString().trim();
          const refId = (d.ref_id || '').toString().trim().toLowerCase();
          const firstName = (d.first_name || '').toString().trim().toLowerCase();
          const lastName = (d.last_name || '').toString().trim().toLowerCase();
          const fullName = `${firstName} ${lastName}`.trim();

          if (license && license.length >= 5 && (rawText.includes(license) || fileName.includes(license) || aiDocNum.includes(license))) {
            proposedType = 'Driver';
            proposedId = d.id;
            proposedName = fullName;
            confidence = 'HIGH';
            matchReason = `Matched driver license/IQAMA number '${license}'`;
            break;
          }

          if (firstName && firstName.length >= 3 && (fileName.toLowerCase().includes(firstName) || rawText.includes(firstName))) {
            proposedType = 'Driver';
            proposedId = d.id;
            proposedName = fullName;
            confidence = 'MEDIUM';
            matchReason = `Matched driver name '${firstName}' in document`;
            break;
          }
        }
      }

      const isCurrentlyLinked = (
        (doc.entity_type === 'Vehicle' && vehicleMap.has(doc.entity_id)) ||
        (doc.entity_type === 'Driver' && driverMap.has(doc.entity_id))
      );

      proposals.push({
        docId: doc.id,
        fileName,
        docType: doc.doc_type,
        fileUrl: doc.file_url,
        entityType: doc.entity_type,
        entityId: doc.entity_id,
        proposedType,
        proposedId,
        proposedName,
        confidence: isCurrentlyLinked ? 'HIGH' : confidence,
        matchReason: isCurrentlyLinked ? 'Already assigned to existing entity' : matchReason,
      });
    }

    res.json({
      success: true,
      data: proposals,
      vehicles,
      drivers,
    });
  } catch (error: any) {
    console.error('Failed previewAutoAssignUnlinkedDocs:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed generating proposals' });
  }
};

/**
 * Confirm and apply user-approved document assignments in batch.
 */
export const confirmAutoAssignDocs = async (req: Request, res: Response) => {
  try {
    const { assignments } = req.body as {
      assignments: Array<{ docId: string; entityType: 'Vehicle' | 'Driver' | 'Company' | 'Operations'; entityId: string }>;
    };

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ success: false, message: 'No assignments provided' });
    }

    const folders = await prisma.folder.findMany({ where: { deletedAt: null } });
    const vehicleFolder = folders.find((f) => f.category === 'Vehicles');
    const driverFolder = folders.find((f) => f.category === 'Drivers');

    let updatedCount = 0;

    for (const item of assignments) {
      if (!item.docId || !item.entityType || !item.entityId) continue;

      let folderIdToSet: string | undefined = undefined;
      if (item.entityType === 'Vehicle' && vehicleFolder) folderIdToSet = vehicleFolder.id;
      if (item.entityType === 'Driver' && driverFolder) folderIdToSet = driverFolder.id;

      await prisma.document.update({
        where: { id: item.docId },
        data: {
          entity_type: item.entityType,
          entity_id: item.entityId,
          ...(folderIdToSet ? { folderId: folderIdToSet } : {}),
        },
      });
      updatedCount++;
    }

    res.json({
      success: true,
      message: `Successfully linked ${updatedCount} document(s)!`,
      updatedCount,
    });
  } catch (error: any) {
    console.error('Failed confirmAutoAssignDocs:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed confirming assignments' });
  }
};
