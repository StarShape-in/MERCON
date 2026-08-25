const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const sshPath = '"C:\\Program Files\\Git\\usr\\bin\\ssh.exe"';
const scpPath = '"C:\\Program Files\\Git\\usr\\bin\\scp.exe"';
const sshHost = 'root@mercon.tech';

const localSqlFile = path.join(__dirname, 'inspect_simple.sql');
const remoteSqlFile = '/tmp/inspect_simple.sql';
const remoteJsonFile = '/tmp/inspect_simple.json';
const localJsonFile = path.join(__dirname, 'inspect_simple.json');

const sql = `
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
`;

fs.writeFileSync(localSqlFile, sql.trim());

console.log('1. Uploading inspect_simple.sql...');
execSync(`${scpPath} -o StrictHostKeyChecking=no ${localSqlFile} ${sshHost}:${remoteSqlFile}`);

console.log('2. Copying to container and executing...');
execSync(`${sshPath} -o StrictHostKeyChecking=no ${sshHost} "docker cp ${remoteSqlFile} dev-postgres:${remoteSqlFile} && docker exec dev-postgres psql -U mercon_dev -d mercon_dev_db -t -A -f ${remoteSqlFile} -o ${remoteJsonFile} && docker cp dev-postgres:${remoteJsonFile} ${remoteJsonFile}"`);

console.log('3. Downloading JSON output...');
const jsonText = execSync(`${sshPath} -n -o StrictHostKeyChecking=no ${sshHost} "cat ${remoteJsonFile}"`, {
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024
});

fs.writeFileSync(localJsonFile, jsonText.trim());
console.log(`Saved inspect_simple.json (${jsonText.trim().length} bytes)`);

const data = JSON.parse(jsonText.trim());
console.log(`Drivers count: ${data.drivers.length}`);
console.log(`Docs count: ${data.docs.length}`);
