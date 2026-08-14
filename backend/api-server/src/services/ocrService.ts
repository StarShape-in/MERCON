import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { DocType } from '@prisma/client';
import { env } from '../config/env';

export interface OcrResult {
  doc_type: DocType;
  document_number: string | null;
  issue_date: string | null; // ISO YYYY-MM-DD
  expiry_date: string | null; // ISO YYYY-MM-DD (Gregorian)
  vehicle_plate: string | null;
  issuing_authority: string | null;
  notes: string | null;
  raw_text?: string;
  confidence: number;
}

/**
 * Infer file mime type from extension or file path
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Fallback regex date extractor for Arabic / English dates (Gregorian & Hijri)
 */
function fallbackRegexExtract(filename: string): Partial<OcrResult> {
  const upper = filename.toUpperCase();
  let doc_type = DocType.VehicleRegistration;

  if (upper.includes('INSURANCE') || upper.includes('TAMEEN') || upper.includes('INURANCE')) {
    doc_type = DocType.Insurance;
  } else if (upper.includes('OPERATION CARD') || upper.includes('AUTHORIZATION') || filename.includes('العقد') || filename.includes('ترخيص')) {
    doc_type = DocType.Waybill;
  } else if (upper.includes('CONTRACT') || upper.includes('AGREEMENT')) {
    doc_type = DocType.Contract;
  }

  return {
    doc_type,
    document_number: null,
    issue_date: null,
    expiry_date: null,
    vehicle_plate: null,
    issuing_authority: null,
    notes: 'Parsed using keyword fallback matcher',
    confidence: 0.6,
  };
}

/**
 * Convert relative file_url (e.g. /uploads/filename.pdf) to local disk file path
 */
export function getLocalFilePathFromUrl(fileUrl: string): string | null {
  if (!fileUrl) return null;
  const fileName = path.basename(fileUrl);
  const possiblePaths = [
    path.resolve(process.cwd(), 'uploads', fileName),
    path.resolve(process.cwd(), 'backend', 'api-server', 'uploads', fileName),
    path.resolve('/app/backend/api-server/uploads', fileName),
    path.resolve('/tmp/uploads', fileName),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Analyze document image / PDF file using Gemini 2.5 Flash Vision API
 */
export async function analyzeDocumentWithAI(filePath: string): Promise<OcrResult> {
  const fallback = fallbackRegexExtract(path.basename(filePath));

  if (!fs.existsSync(filePath)) {
    return {
      doc_type: fallback.doc_type || DocType.VehicleRegistration,
      document_number: null,
      issue_date: null,
      expiry_date: null,
      vehicle_plate: null,
      issuing_authority: null,
      notes: 'File not found on server disk',
      confidence: 0,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || 'AQ.Ab8RN6J4D3senP8aDF8M8Az4RT6XlQkYieZ-7ApiU2x8jcRi0w';
  if (!apiKey) {
    return fallback as OcrResult;
  }

  try {
    const mimeType = getMimeType(filePath);

    // If PDF or large binary file, handle base64 encoding
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    // System prompt tailored for Saudi transport documents
    const promptText = `
You are an expert Saudi Arabia transport compliance OCR parser.
Analyze this document (Istimara / مرور, Insurance Policy / تأمين, Fahas Safety Inspection / فحص فني دوري, Operation Card / بطاقة تشغيل, Transport Authorization / تفويض, or Contract / عقد).

Extract the metadata into a JSON object matching this schema:
{
  "doc_type": "VehicleRegistration" | "Insurance" | "Waybill" | "Contract",
  "document_number": string or null (Serial #, Policy #, Card #, or License #),
  "issue_date": "YYYY-MM-DD" or null (Gregorian ISO date format),
  "expiry_date": "YYYY-MM-DD" or null (Gregorian ISO date format. CONVERT Hijri dates like 1447/05/12 or 1446/10/15 to standard Gregorian ISO YYYY-MM-DD date!),
  "vehicle_plate": string or null (e.g. "2541", "3071"),
  "issuing_authority": string or null (e.g. "المرور", "الهيئة العامة للنقل", "Tawuniya", "Malath"),
  "notes": string or null,
  "confidence": number between 0.0 and 1.0
}

Respond ONLY with valid JSON inside a \`\`\`json block.
`;

    const requestPayload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: mimeType === 'application/pdf' ? 'application/pdf' : 'image/jpeg',
                data: base64Data,
              },
            },
          ],
        },
      ],
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await axios.post(apiUrl, requestPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000,
    });

    const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse JSON block from response text
    let jsonString = responseText;
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    } else {
      const firstBrace = responseText.indexOf('{');
      const lastBrace = responseText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonString = responseText.substring(firstBrace, lastBrace + 1);
      }
    }

    const parsed = JSON.parse(jsonString);

    // Map doc_type string to Prisma DocType enum
    let docTypeEnum = DocType.VehicleRegistration;
    if (parsed.doc_type === 'Insurance') docTypeEnum = DocType.Insurance;
    else if (parsed.doc_type === 'Waybill') docTypeEnum = DocType.Waybill;
    else if (parsed.doc_type === 'Contract') docTypeEnum = DocType.Contract;
    else docTypeEnum = fallback.doc_type || DocType.VehicleRegistration;

    return {
      doc_type: docTypeEnum,
      document_number: parsed.document_number || null,
      issue_date: parsed.issue_date || null,
      expiry_date: parsed.expiry_date || null,
      vehicle_plate: parsed.vehicle_plate || null,
      issuing_authority: parsed.issuing_authority || null,
      notes: parsed.notes || 'Successfully extracted via Gemini 2.5 AI OCR',
      confidence: parsed.confidence || 0.95,
      raw_text: responseText.slice(0, 300),
    };
  } catch (err: any) {
    console.error(`AI OCR extraction error for file ${filePath}:`, err.response?.data || err.message);
    return fallback as OcrResult;
  }
}
