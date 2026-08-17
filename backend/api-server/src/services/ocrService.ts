import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { DocType } from '@prisma/client';
import { env } from '../config/env';

export interface OcrResult {
  doc_type: DocType;
  /**
   * The configured DocumentType.code this document matches, or null when the
   * model could not tell. Null is a real, useful answer — the caller surfaces
   * it as "needs input" rather than writing a wrong type, which is what the
   * old VehicleRegistration default silently did to most of the vault.
   */
  document_type_code: string | null;
  /**
   * Short plain-language description of what the document actually is, filled
   * in whether or not it matched a configured type ("Vehicle insurance
   * policy", "Bank statement", "Photo of a truck"). This is what lets the
   * import tell a user that a file is simply out of scope instead of leaving
   * them to guess why it wouldn't classify.
   */
  detected_kind: string | null;
  document_number: string | null;
  issue_date: string | null; // ISO YYYY-MM-DD
  expiry_date: string | null; // ISO YYYY-MM-DD (Gregorian)
  vehicle_plate: string | null;
  issuing_authority: string | null;
  extra_details?: Record<string, any> | null;
  notes: string | null;
  raw_text?: string;
  confidence: number;
  /**
   * Set when the file could not be read at all (corrupt/empty PDF, unsupported
   * image, missing on disk) as opposed to being read but not classifiable.
   * Callers must keep these apart: an unreadable file needs replacing, while an
   * unclassified one just needs a human to pick the type. Collapsing the two
   * sends the user off hand-assigning an owner to a file that can never be
   * usefully stored.
   */
  extraction_error?: string | null;
}

/** One entry of the live DocumentType catalogue, passed into the prompt. */
export interface DocumentTypeChoice {
  code: string;
  name: string;
  ownerType: string;
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
  let doc_type: DocType = DocType.VehicleRegistration;

  if (upper.includes('INSURANCE') || upper.includes('TAMEEN') || upper.includes('INURANCE')) {
    doc_type = DocType.Insurance;
  } else if (upper.includes('OPERATION CARD') || upper.includes('AUTHORIZATION') || filename.includes('العقد') || filename.includes('ترخيص')) {
    doc_type = DocType.Waybill;
  } else if (upper.includes('CONTRACT') || upper.includes('AGREEMENT')) {
    doc_type = DocType.Contract;
  }

  return {
    doc_type,
    document_type_code: null,
    detected_kind: null,
    document_number: null,
    issue_date: null,
    expiry_date: null,
    vehicle_plate: null,
    issuing_authority: null,
    extra_details: null,
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
export async function analyzeDocumentWithAI(
  filePath: string,
  /**
   * The live DocumentType catalogue. Passing it lets the model answer in the
   * customer's own configured codes, so a type an admin adds in
   * /settings/document-types becomes detectable with no code change. Omitted
   * by legacy callers, which keeps their existing enum-only behaviour.
   */
  documentTypes?: DocumentTypeChoice[],
): Promise<OcrResult> {
  const fallback = fallbackRegexExtract(path.basename(filePath));

  if (!fs.existsSync(filePath)) {
    return {
      doc_type: fallback.doc_type || DocType.VehicleRegistration,
      document_type_code: null,
      detected_kind: null,
      document_number: null,
      issue_date: null,
      expiry_date: null,
      vehicle_plate: null,
      issuing_authority: null,
      extra_details: null,
      notes: 'File not found on server disk',
      confidence: 0,
      extraction_error: 'File not found on server disk',
    };
  }

  const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || 'AQ.Ab8RN6J4D3senP8aDF8M8Az4RT6XlQkYieZ-7ApiU2x8jcRi0w';
  if (!apiKey) {
    return fallback as OcrResult;
  }

  try {
    const mimeType = getMimeType(filePath);

    // Handle file buffer size optimization
    let fileBuffer = fs.readFileSync(filePath);
    if (fileBuffer.length > 4 * 1024 * 1024) {
      fileBuffer = fileBuffer.subarray(0, 3 * 1024 * 1024);
    }
    const base64Data = fileBuffer.toString('base64');

    // The configured catalogue drives classification when the caller supplies
    // it, so this prompt stays correct for any customer's document set rather
    // than only Mercon's. `null` is explicitly allowed and encouraged: a wrong
    // confident answer costs a user more than an honest "I don't know".
    const catalogueBlock = documentTypes && documentTypes.length > 0
      ? `
This system is configured with the following document types. Choose the ONE
whose code best matches this document and return it as "document_type_code".
If none of them genuinely match, return null — do NOT force a guess.

${documentTypes.map((t) => `  - code "${t.code}" — ${t.name} (belongs to a ${t.ownerType})`).join('\n')}
`
      : `
  "document_type_code": null,
`;

    // System prompt tailored for Saudi transport documents
    const promptText = `
You are an expert Saudi Arabia transport compliance OCR parser.
Analyze this document (Istimara / مرور, Insurance Policy / تأمين, Fahas Safety Inspection / فحص فني دوري, Operation Card / بطاقة تشغيل, Transport Authorization / تفويض, IQAMA / إقامة, Passport / جواز سفر, Driver Card / بطاقة سائق, or Contract / عقد).
${catalogueBlock}
Extract the metadata into a JSON object matching this schema:
{
  "document_type_code": string or null (one of the configured codes listed above),
  "detected_kind": string (ALWAYS fill this in, even when document_type_code is null - a short plain-English description of what this document actually is, e.g. "Vehicle registration (Istimara)", "Bank statement", "Photo of a truck", "Handwritten note". This is how an out-of-scope file gets reported back to the user),
  "doc_type": "VehicleRegistration" | "Insurance" | "Waybill" | "Contract",
  "document_number": string or null (Serial #, Policy #, Card #, or License #),
  "issue_date": "YYYY-MM-DD" or null (Gregorian ISO date format),
  "expiry_date": "YYYY-MM-DD" or null (Gregorian ISO date format. CONVERT Hijri dates like 1447/05/12 or 1446/10/15 to standard Gregorian ISO YYYY-MM-DD date!),
  "vehicle_plate": string or null (e.g. "2541", "3071"),
  "issuing_authority": string or null (CRITICAL: Always provide BOTH English and Arabic names! For example: "Malath Insurance (شركة ملاذ للتأمين)", "Saudi Traffic Dept (المرور)", "Transport General Authority (الهيئة العامة للنقل)", "Vehicles Safety Center (مركز سلامة المركبات)", "Capital Symbol Motors (معرض رمز العاصمة للسيارات)", "Power Barriers Factory (مصنع حواجز القوة للصناعة)"),
  "extra_details": object or null (Include ALL extra useful fields found in the document like: issue_id, chassis_number, owner_name, owner_id, vehicle_make, vehicle_year, weight_kg, policy_type, coverage_amount),
  "notes": string or null,
  "confidence": number between 0.0 and 1.0
}

Respond ONLY with valid JSON inside a json code block.
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
      timeout: 60000,
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
    let docTypeEnum: DocType = DocType.VehicleRegistration;
    if (parsed.doc_type === 'Insurance') docTypeEnum = DocType.Insurance;
    else if (parsed.doc_type === 'Waybill') docTypeEnum = DocType.Waybill;
    else if (parsed.doc_type === 'Contract') docTypeEnum = DocType.Contract;
    else docTypeEnum = fallback.doc_type || DocType.VehicleRegistration;

    // Only accept a code that actually exists in the catalogue we sent — a
    // hallucinated code must not become a silent mis-classification.
    const rawCode = (parsed.document_type_code || '').toString().trim();
    const documentTypeCode = rawCode && documentTypes?.some((t) => t.code.toLowerCase() === rawCode.toLowerCase())
      ? documentTypes.find((t) => t.code.toLowerCase() === rawCode.toLowerCase())!.code
      : null;

    return {
      doc_type: docTypeEnum,
      document_type_code: documentTypeCode,
      detected_kind: parsed.detected_kind || null,
      document_number: parsed.document_number || null,
      issue_date: parsed.issue_date || null,
      expiry_date: parsed.expiry_date || null,
      vehicle_plate: parsed.vehicle_plate || null,
      issuing_authority: parsed.issuing_authority || null,
      extra_details: parsed.extra_details || null,
      notes: parsed.notes || 'Successfully extracted via Gemini 2.5 AI OCR',
      confidence: parsed.confidence || 0.95,
      raw_text: responseText.slice(0, 300),
    };
  } catch (err: any) {
    console.error(`AI OCR extraction error for file ${filePath}:`, err.response?.data || err.message);
    // Surface *why* it failed rather than quietly handing back the filename
    // guess — "The document has no pages" (a corrupt PDF) must not reach the
    // user as an ordinary low-confidence result they can fix by picking a type.
    const apiMessage = err.response?.data?.error?.message;
    return {
      ...(fallback as OcrResult),
      extraction_error: apiMessage || err.message || 'Could not read this file',
    };
  }
}
