SELECT json_build_object(
  'drivers', (
    SELECT json_agg(row_to_json(d))
    FROM (
      SELECT 
        d.id, 
        d.ref_id, 
        d.first_name, 
        d.last_name, 
        d.phone_primary, 
        d.status, 
        d.license_number, 
        d.license_expiry, 
        d.ai_risk_score, 
        d."createdAt", 
        d."updatedAt", 
        d."deletedAt", 
        d."isActive",
        (SELECT v.plate_number FROM "Vehicle" v WHERE v.id = d."assignedVehicleId") as "assignedVehiclePlate"
      FROM "Driver" d
      WHERE d."deletedAt" IS NULL
    ) d
  ),
  'docs', (
    SELECT json_agg(row_to_json(doc))
    FROM (
      SELECT 
        doc.id, 
        doc.entity_type, 
        doc.entity_id, 
        doc.doc_type, 
        doc.status, 
        doc."documentTypeId", 
        doc.file_url, 
        doc.mime_type, 
        doc.issue_date, 
        doc.expiry_date, 
        doc."createdAt", 
        doc."updatedAt", 
        doc."deletedAt",
        (SELECT row_to_json(dt) FROM "DocumentType" dt WHERE dt.id = doc."documentTypeId") as "documentType"
      FROM "Document" doc
      WHERE doc.entity_type = 'Driver' AND doc."deletedAt" IS NULL
    ) doc
  ),
  'docTypes', (
    SELECT json_agg(row_to_json(dt))
    FROM (
      SELECT dt.id, dt.code, dt.name, dt.description, dt."ownerType", dt."requirementStatus", dt."isActive"
      FROM "DocumentType" dt
    ) dt
  )
);
