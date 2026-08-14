import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

const TRUCKS_DOCS_DIR = 'C:\\Users\\ILAN\\Downloads\\Trucks Docs\\Trucks Docs';

async function uploadAllToVps() {
  console.log('🚀 Logging in to MERCON Production VPS (https://mercon.tech)...');
  const loginRes = await axios.post('https://mercon.tech/api/auth/login', {
    username: 'ilan',
    password: 'ilan1234',
  });
  const token = loginRes.data.data.token;
  console.log('✅ Admin Logged In!');

  function getAllFiles(dir: string, baseDir: string = dir): { filePath: string; relativePath: string }[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let results: { filePath: string; relativePath: string }[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        results = results.concat(getAllFiles(fullPath, baseDir));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext !== '.rar' && ext !== '.zip' && !entry.name.startsWith('.')) {
          results.push({ filePath: fullPath, relativePath: relPath });
        }
      }
    }
    return results;
  }

  const allFiles = getAllFiles(TRUCKS_DOCS_DIR);
  console.log(`📁 Found ${allFiles.length} files in ${TRUCKS_DOCS_DIR}`);

  let successCount = 0;
  for (let i = 0; i < allFiles.length; i++) {
    const { filePath, relativePath } = allFiles[i];

    // Check file size on disk before upload
    const stat = fs.statSync(filePath);
    if (stat.size > 1.5 * 1024 * 1024) {
      console.log(`[${i + 1}/${allFiles.length}] Skipping large ${stat.size} bytes file ${relativePath}`);
      continue;
    }

    const form = new FormData();
    form.append('files', fs.createReadStream(filePath), path.basename(filePath));
    form.append('relative_paths', JSON.stringify([relativePath]));

    try {
      console.log(`[${i + 1}/${allFiles.length}] Uploading ${relativePath} (${Math.round(stat.size / 1024)} KB)...`);
      await axios.post('https://mercon.tech/api/documents/batch-upload-folder', form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${token}`,
        },
        timeout: 45000,
      });
      successCount++;
    } catch (err: any) {
      console.error(`❌ Error uploading ${relativePath}:`, err.response?.data || err.message);
    }
  }

  console.log(`🎉 Finished uploading ${successCount}/${allFiles.length} files to Production VPS!`);

  // Now trigger AI Vision OCR extraction on VPS
  console.log('🤖 Triggering Gemini AI Vision OCR extraction on VPS database...');
  const ocrRes = await axios.post(
    'https://mercon.tech/api/documents/bulk-ocr-extract',
    { only_missing_expiry: false, limit: 250 },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log('📊 VPS AI OCR EXTRACTION RESULT:', JSON.stringify(ocrRes.data, null, 2));
}

uploadAllToVps();
