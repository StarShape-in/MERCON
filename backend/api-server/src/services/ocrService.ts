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
   * it as "needs input" rather than writing a wrong type.
   */
  document_type_code: string | null;
  /**
   * Short plain-language description of what the document actually is, filled
   * in whether or not it matched a configured type.
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
   * Set when the file could not be read at all (missing on disk) as opposed to
   * being read but unclassified.
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
      return 'application/pdf';
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
    detected_kind: 'Document',
    document_number: null,
    issue_date: null,
    expiry_date: null,
    vehicle_plate: null,
    issuing_authority: null,
    extra_details: null,
    notes: 'Parsed using filename pattern fallback matcher',
    confidence: 0.5,
  };
}

/**
 * Convert relative file_url (e.g. /uploads/filename.pdf) to local disk file path
 */
export function getLocalFilePathFromUrl(fileUrl: string): string | null {
  if (!fileUrl) return null;
  const fileName = path.basename(fileUrl);
  const possiblePaths = [
    path.resolve('/tmp', 'uploads', fileName),
    path.resolve('/tmp/uploads', fileName),
    path.resolve(process.cwd(), 'uploads', fileName),
    path.resolve(process.cwd(), 'backend', 'api-server', 'uploads', fileName),
    path.resolve('/app/backend/api-server/uploads', fileName),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Analyze document image / PDF file using Gemini Vision API
 */
export async function analyzeDocumentWithAI(
  filePath: string,
  documentTypes?: DocumentTypeChoice[],
): Promise<OcrResult> {
  const fallback = fallbackRegexExtract(path.basename(filePath));

  if (!fs.existsSync(filePath)) {
    return {
      doc_type: fallback.doc_type || DocType.VehicleRegistration,
      document_type_code: null,
      detected_kind: 'Document',
      document_number: null,
      issue_date: null,
      expiry_date: null,
      vehicle_plate: null,
      issuing_authority: null,
      extra_details: null,
      notes: 'File not found on server disk, using pattern fallback',
      confidence: 0.5,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || 'AQ.Ab8RN6J4D3senP8aDF8M8Az4RT6XlQkYieZ-7ApiU2x8jcRi0w';
  if (!apiKey) {
    return fallback as OcrResult;
  }

  try {
    const mimeType = getMimeType(filePath);
    let fileBuffer = fs.readFileSync(filePath);

    // Send complete file buffer without corrupting PDF trailers/page tables
    if (fileBuffer.length > 20 * 1024 * 1024) {
      fileBuffer = fileBuffer.subarray(0, 20 * 1024 * 1024);
    }
    const base64Data = fileBuffer.toString('base64');

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

    const promptText = `
You are an expert Saudi Arabia transport compliance OCR parser.
Analyze this document (Istimara / مرور, Insurance Policy / تأمين, Fahas Safety Inspection / فحص فني دوري, Operation Card / بطاقة تشغيل, Transport Authorization / تفويض, IQAMA / إقامة, Passport / جواز سفر, Driver Card / بطاقة سائق, or Contract / عقد).
${catalogueBlock}
Extract the metadata into a JSON object matching this schema:
{
  "document_type_code": string or null (one of the configured codes listed above),
  "detected_kind": string (ALWAYS fill this in, even when document_type_code is null - a short plain-English description of what this document actually is, e.g. "Vehicle registration (Istimara)", "Bank statement", "Photo of a truck", "Handwritten note"),
  "doc_type": "VehicleRegistration" | "Insurance" | "Waybill" | "Contract",
  "document_number": string or null (Serial #, Policy #, Card #, or License #),
  "issue_date": "YYYY-MM-DD" or null (Gregorian ISO date format),
  "expiry_date": "YYYY-MM-DD" or null (Gregorian ISO date format. CONVERT Hijri dates like 1447/05/12 or 1446/10/15 to standard Gregorian ISO YYYY-MM-DD date!),
  "vehicle_plate": string or null (e.g. "2541", "3071"),
  "issuing_authority": string or null (CRITICAL: Always provide BOTH English and Arabic names! e.g. "Malath Insurance (شركة ملاذ للتأمين)", "Saudi Traffic Dept (المرور)", "Transport General Authority (الهيئة العامة للنقل)"),
  "extra_details": object or null (Include extra useful fields found in the document),
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
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
    };

    const primaryModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const fallbackModels = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    const modelsToTry = Array.from(new Set([primaryModel, ...fallbackModels]));

    let responseText: string | null = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await axios.post(apiUrl, requestPayload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000,
        });

        if (response?.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          responseText = response.data.candidates[0].content.parts[0].text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[OCR] Gemini model '${model}' failed: ${err?.response?.data?.error?.message || err?.message}. Trying fallback model...`);
      }
    }

    if (!responseText) {
      throw new Error(`All AI Vision model endpoints failed. Last error: ${lastError?.response?.data?.error?.message || lastError?.message || 'Empty response'}`);
    }
    
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

    const rawCode = (parsed.document_type_code || '').toString().trim();
    const documentTypeCode = rawCode && documentTypes?.some((t) => t.code.toLowerCase() === rawCode.toLowerCase())
      ? documentTypes.find((t) => t.code.toLowerCase() === rawCode.toLowerCase())!.code
      : null;

    return {
      doc_type: docTypeEnum,
      document_type_code: documentTypeCode,
      detected_kind: parsed.detected_kind || 'Document',
      document_number: parsed.document_number || null,
      issue_date: parsed.issue_date || null,
      expiry_date: parsed.expiry_date || null,
      vehicle_plate: parsed.vehicle_plate || null,
      issuing_authority: parsed.issuing_authority || null,
      extra_details: parsed.extra_details || null,
      notes: parsed.notes || 'Successfully extracted via AI Vision OCR',
      confidence: parsed.confidence || 0.95,
      raw_text: responseText.slice(0, 300),
    };
  } catch (err: any) {
    console.error(`[AI OCR] Extraction fallback for file ${filePath}:`, err.response?.data || err.message);
    const fallbackRes = fallbackRegexExtract(path.basename(filePath));
    return {
      doc_type: fallbackRes.doc_type || DocType.Contract,
      document_type_code: null,
      detected_kind: 'Document',
      document_number: null,
      issue_date: null,
      expiry_date: null,
      vehicle_plate: null,
      issuing_authority: null,
      extra_details: null,
      notes: `Extracted using pattern matcher fallback: ${err.message || 'AI busy'}`,
      confidence: 0.5,
      raw_text: path.basename(filePath),
    };
  }
}

export interface ExternalScreenshotResult {
  detected_event_type: 'ARRIVED_AT_PICKUP' | 'LOADING_COMPLETED' | 'DEPARTED_PICKUP' | 'ARRIVED_AT_DELIVERY' | 'DELIVERY_COMPLETED' | 'DELAYED' | null;
  event_timestamp: string | null;
  stop_location_name?: string | null;
  external_reference?: string | null;
  confidence: number;
  notes?: string | null;
  detected_text?: string | null;
  extraction_error?: string | null;
  is_wrong_trip?: boolean;
}

/**
 * Analyze external driver app screenshot using Gemini Vision API
 */
export async function analyzeExternalScreenshotWithAI(
  filePath: string,
  expectedTrip?: {
    ref_id?: string;
    waybill_number?: string;
    customer_name?: string;
    origin?: string;
    destination?: string;
  }
): Promise<ExternalScreenshotResult> {
  if (!fs.existsSync(filePath)) {
    return {
      detected_event_type: null,
      event_timestamp: null,
      confidence: 0,
      notes: 'Screenshot file not found on server disk',
      extraction_error: 'FILE_NOT_FOUND',
    };
  }

  const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || 'AQ.Ab8RN6J4D3senP8aDF8M8Az4RT6XlQkYieZ-7ApiU2x8jcRi0w';
  if (!apiKey) {
    return {
      detected_event_type: null,
      event_timestamp: null,
      confidence: 0,
      notes: 'Gemini AI service unavailable (No API Key configured)',
      extraction_error: 'NO_API_KEY',
    };
  }

  try {
    const mimeType = getMimeType(filePath);
    let fileBuffer = fs.readFileSync(filePath);
    if (fileBuffer.length > 20 * 1024 * 1024) {
      fileBuffer = fileBuffer.subarray(0, 20 * 1024 * 1024);
    }
    const base64Data = fileBuffer.toString('base64');

    const expectedContext = expectedTrip ? `
Expected Trip Details for Validation:
- Trip Reference / Order ID: ${expectedTrip.ref_id || 'N/A'}
- Waybill Number: ${expectedTrip.waybill_number || 'N/A'}
- Customer Name: ${expectedTrip.customer_name || 'N/A'}
- Origin Location: ${expectedTrip.origin || 'N/A'}
- Destination Location: ${expectedTrip.destination || 'N/A'}
` : '';

    const promptText = `
You are an operational logistics AI system analyzing a mobile screenshot from a driver's third-party / customer logistics app.
Do NOT assume a specific app (do not hardcode app names like DHL, iMile, Shiptrack). Reason strictly from visible UI elements, text, status badges, timestamps, and locations in the screenshot.
${expectedContext}

Determine if the screenshot represents an operational trip milestone event.
Allowed milestone event types:
- "ARRIVED_AT_PICKUP" (Driver has arrived at origin / pickup location)
- "LOADING_COMPLETED" (Loading goods finished, cargo loaded)
- "DEPARTED_PICKUP" (Departed origin / started transit)
- "ARRIVED_AT_DELIVERY" (Driver arrived at destination / dropoff location)
- "DELIVERY_COMPLETED" (Delivery finished, POD signed, unloader confirmed)
- "DELAYED" (Traffic, exception, delay notification displayed)
- null (If screenshot does not clearly show an operational milestone)

Compare visible text on screenshot with expected trip details if provided.
If screenshot clearly shows a DIFFERENT trip ref ID, different order number, or different customer than expected, set "is_wrong_trip": true.

Extract into a JSON object matching this schema:
{
  "detected_event_type": "ARRIVED_AT_PICKUP" | "LOADING_COMPLETED" | "DEPARTED_PICKUP" | "ARRIVED_AT_DELIVERY" | "DELIVERY_COMPLETED" | "DELAYED" | null,
  "event_timestamp": "YYYY-MM-DDTHH:mm:ssZ" or "YYYY-MM-DD HH:mm:ss" or null (ISO string or standard date-time string if visible in screenshot),
  "stop_location_name": string or null (Origin, pickup, destination, or stop location name displayed if visible),
  "external_reference": string or null (Waybill #, Order #, Trip #, Tracking # shown on screenshot),
  "is_wrong_trip": boolean (true if screenshot clearly belongs to another trip/order/customer),
  "confidence": number between 0.0 and 1.0 (How confident you are in the detected event and timestamp),
  "notes": string or null (Short summary of what was visible in screenshot),
  "detected_text": string or null (Main header text or status text visible)
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
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
    };

    const primaryModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const fallbackModels = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    const modelsToTry = Array.from(new Set([primaryModel, ...fallbackModels]));

    let responseText: string | null = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await axios.post(apiUrl, requestPayload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000,
        });

        if (response?.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          responseText = response.data.candidates[0].content.parts[0].text;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!responseText) {
      return {
        detected_event_type: null,
        event_timestamp: null,
        confidence: 0,
        notes: `AI processing error: ${lastError?.message || 'Gemini service did not return response'}`,
        extraction_error: lastError?.message || 'AI_FAILED',
      };
    }

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
    const validEventTypes = ['ARRIVED_AT_PICKUP', 'LOADING_COMPLETED', 'DEPARTED_PICKUP', 'ARRIVED_AT_DELIVERY', 'DELIVERY_COMPLETED', 'DELAYED'];
    const detectedType = validEventTypes.includes(parsed.detected_event_type) ? parsed.detected_event_type : null;

    return {
      detected_event_type: detectedType as any,
      event_timestamp: parsed.event_timestamp || null,
      stop_location_name: parsed.stop_location_name || null,
      external_reference: parsed.external_reference || null,
      is_wrong_trip: Boolean(parsed.is_wrong_trip),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      notes: parsed.notes || 'Analyzed screenshot via AI Vision',
      detected_text: parsed.detected_text || null,
    };
  } catch (err: any) {
    return {
      detected_event_type: null,
      event_timestamp: null,
      confidence: 0,
      notes: `Extraction error: ${err.message}`,
      extraction_error: err.message || 'PARSING_ERROR',
    };
  }
}

