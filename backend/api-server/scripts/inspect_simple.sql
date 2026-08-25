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
        (SELECT v.plate_number FROM "Vehicle" v WHERE v.id = d."assignedVehicleId") as "assigned_vehicle"
      FROM "Driver" d
      WHERE d."deletedAt" IS NULL
      ORDER BY d.ref_id, d.first_name
    ) d
  ),
  'docs', (
    SELECT json_agg(row_to_json(doc))
    FROM (
      SELECT 
        doc.id, 
        doc.entity_id, 
        doc.doc_type, 
        doc.status, 
        doc."documentTypeId", 
        doc.file_url, 
        doc.issue_date, 
        doc.expiry_date,
        dt.code as "doc_type_code",
        dt.name as "doc_type_name"
      FROM "Document" doc
      LEFT JOIN "DocumentType" dt ON dt.id = doc."documentTypeId"
      WHERE doc.entity_type = 'Driver' AND doc."deletedAt" IS NULL
    ) doc
  )
);