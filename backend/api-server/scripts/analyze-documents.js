const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'inspect_simple.json'), 'utf8'));

const drivers = data.drivers;
const docs = data.docs;

console.log(`=== TOTAL DRIVERS: ${drivers.length} ===`);
console.log(`=== TOTAL DOCUMENTS: ${docs.length} ===\n`);

const today = new Date('2026-08-25T00:00:00.000Z');

drivers.forEach(d => {
  const driverDocs = docs.filter(doc => doc.entity_id === d.id);
  console.log(`Driver: ${d.ref_id || 'N/A'} - ${d.first_name} ${d.last_name} (Phone: ${d.phone_primary || 'N/A'}, Vehicle: ${d.assigned_vehicle || 'None'})`);
  console.log(`  Driver Model License: Number=${d.license_number || 'N/A'}, Expiry=${d.license_expiry ? d.license_expiry.split('T')[0] : 'N/A'}`);
  console.log(`  Uploaded Docs (${driverDocs.length}):`);
  
  driverDocs.forEach(doc => {
    const typeName = doc.doc_type_name || doc.doc_type_code || doc.doc_type;
    const expiry = doc.expiry_date ? doc.expiry_date.split('T')[0] : 'No Expiry Date';
    let expStatus = 'VALID';
    if (doc.expiry_date) {
      const expD = new Date(doc.expiry_date);
      const diffDays = Math.ceil((expD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) expStatus = `EXPIRED (${Math.abs(diffDays)}d ago)`;
      else if (diffDays <= 30) expStatus = `NEAR EXPIRY (${diffDays}d left)`;
      else if (diffDays <= 60) expStatus = `EXPIRING SOON (${diffDays}d left)`;
      else expStatus = `VALID (${diffDays}d left)`;
    }
    console.log(`    - [${typeName}] status: ${doc.status}, expiry: ${expiry} -> ${expStatus}`);
  });
  console.log('');
});
