import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

const TRUCKS_DOCS_DIR = 'C:\\Users\\ILAN\\Downloads\\Trucks Docs\\Trucks Docs';

async function uploadActualFilesToVps() {
  console.log('🚀 Logging in to MERCON Production VPS (https://mercon.tech/api/auth/login)...');
  const loginRes = await axios.post('https://mercon.tech/api/auth/login', {
    username: 'ilan',
    password: 'ilan1234',
  });
  const token = loginRes.data.data.token;
  const headers = { Authorization: `Bearer ${token}` };
  console.log('✅ Logged in to Production VPS!');

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
    const stat = fs.statSync(filePath);
    const parts = relativePath.split('/');
    const cleanId = parts.length >= 2 ? parts[0] : '';
    const baseName = path.basename(filePath);
    const ext = path.extname(filePath);
    const safeFilename = `truck-${cleanId}-${Date.now()}-${i}${ext}`;

    try {
      if (stat.size > 500 * 1024) {
        // Micro-chunk upload for files > 500KB (100% immune to NGINX limits)
        console.log(`[${i + 1}/${allFiles.length}] Chunk uploading ${relativePath} (${Math.round(stat.size / 1024)} KB)...`);
        const fileBuffer = fs.readFileSync(filePath);
        const chunkSize = 250 * 1024; // 250KB per chunk
        const totalChunks = Math.ceil(fileBuffer.length / chunkSize);

        for (let c = 0; c < totalChunks; c++) {
          const start = c * chunkSize;
          const end = Math.min(start + chunkSize, fileBuffer.length);
          const chunkBase64 = fileBuffer.subarray(start, end).toString('base64');

          await axios.post(
            'https://mercon.tech/api/documents/upload-raw-chunk',
            {
              filename: safeFilename,
              chunk: chunkBase64,
              isFirst: c === 0,
              isLast: c === totalChunks - 1,
              cleanId,
            },
            { headers, timeout: 30000 }
          );
        }
        successCount++;
      } else {
        // Direct multipart upload for small files
        console.log(`[${i + 1}/${allFiles.length}] Direct uploading ${relativePath} (${Math.round(stat.size / 1024)} KB)...`);
        const form = new FormData();
        form.append('files', fs.createReadStream(filePath), baseName);
        form.append('relative_paths', JSON.stringify([relativePath]));

        await axios.post('https://mercon.tech/api/documents/batch-upload-folder', form, {
          headers: {
            ...headers,
            ...form.getHeaders(),
          },
          timeout: 30000,
        });
        successCount++;
      }
    } catch (err: any) {
      console.error(`❌ Error uploading ${relativePath}:`, err.response?.data || err.message);
    }
  }

  console.log(`🎉 Finished uploading ${successCount}/${allFiles.length} files directly to Production VPS!`);
}

uploadActualFilesToVps();
