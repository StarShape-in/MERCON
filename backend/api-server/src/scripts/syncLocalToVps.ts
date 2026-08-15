import { prisma } from '../db';
import axios from 'axios';

async function syncLocalToVps() {
  console.log('🚀 Logging in to Production VPS (https://mercon.tech/api/auth/login)...');
  const loginRes = await axios.post('https://mercon.tech/api/auth/login', {
    username: 'ilan',
    password: 'ilan1234',
  });
  const token = loginRes.data.data.token;
  const headers = { Authorization: `Bearer ${token}` };
  console.log('✅ Logged in to Production VPS!');

  console.log('🔍 Step 1: Fetching all Vehicles and Documents from Production VPS...');
  const [vpsVehiclesRes, vpsDocsRes] = await Promise.all([
    axios.get('https://mercon.tech/api/vehicles?per_page=500', { headers }),
    axios.get('https://mercon.tech/api/documents?per_page=500', { headers }),
  ]);

  const vpsVehicles = vpsVehiclesRes.data.data || [];
  const vpsDocs = vpsDocsRes.data.data || [];
  console.log(`🌐 Production VPS has ${vpsVehicles.length} vehicles and ${vpsDocs.length} documents in DB.`);

  console.log('🔍 Step 2: Fetching local extracted document records from Local DB...');
  const localDocs = await prisma.document.findMany({
    where: {
      deletedAt: null,
      expiry_date: { not: null },
    },
    select: {
      id: true,
      entity_type: true,
      entity_id: true,
      doc_type: true,
      file_url: true,
      expiry_date: true,
      issue_date: true,
      status: true,
      ai_extracted_json: true,
      ocr_raw_text: true,
    },
  });

  const localVehicles = await prisma.vehicle.findMany({
    select: { id: true, plate_number: true, ref_id: true },
  });
  const localVehicleMap = new Map<string, string>();
  localVehicles.forEach((v) => {
    const digits = (v.plate_number || v.ref_id || '').replace(/\D/g, '');
    if (digits) localVehicleMap.set(v.id, digits);
  });

  const syncRecords: any[] = [];
  for (const doc of localDocs) {
    const aiJson: any = doc.ai_extracted_json || {};
    const plateDigits = localVehicleMap.get(doc.entity_id || '') || (aiJson.vehicle_plate || '').replace(/\D/g, '');

    if (!plateDigits || plateDigits.length < 3) continue;

    // Find VPS Vehicle matching these digits
    const matchingVpsVehicle = vpsVehicles.find((vv: any) => {
      const vpsPlateDigits = (vv.plate_number || vv.ref_id || '').replace(/\D/g, '');
      return vpsPlateDigits.includes(plateDigits) || plateDigits.includes(vpsPlateDigits);
    });

    if (matchingVpsVehicle) {
      // Find matching document on VPS for this vehicle
      const matchingVpsDoc = vpsDocs.find((vd: any) => vd.entity_id === matchingVpsVehicle.id && vd.doc_type === doc.doc_type) ||
        vpsDocs.find((vd: any) => vd.entity_id === matchingVpsVehicle.id && !vd.expiry_date);

      if (matchingVpsDoc) {
        syncRecords.push({
          id: matchingVpsDoc.id,
          doc_type: doc.doc_type,
          expiry_date: doc.expiry_date,
          issue_date: doc.issue_date,
          ai_extracted_json: doc.ai_extracted_json,
          ocr_raw_text: doc.ocr_raw_text,
        });
      }
    }
  }

  console.log(`🎯 Matched ${syncRecords.length} extracted records directly to Production VPS document IDs!`);

  if (syncRecords.length > 0) {
    console.log('📤 Pushing matched records to Production VPS Database...');
    const syncRes = await axios.post(
      'https://mercon.tech/api/documents/sync-local-records',
      { records: syncRecords },
      { headers }
    );
    console.log('🎉 PRODUCTION VPS SYNC COMPLETE:', JSON.stringify(syncRes.data, null, 2));
  }

  await prisma.$disconnect();
}

syncLocalToVps();
