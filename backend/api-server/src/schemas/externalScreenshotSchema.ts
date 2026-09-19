import { z } from 'zod';

export const ExternalScreenshotEventEnum = z.enum([
  'ARRIVED_AT_PICKUP',
  'LOADING_COMPLETED',
  'DEPARTED_PICKUP',
  'ARRIVED_AT_DELIVERY',
  'DELIVERY_COMPLETED',
  'DELAYED',
]);

export type ExternalScreenshotEventType = z.infer<typeof ExternalScreenshotEventEnum>;

/**
 * Strict Zod schema for untrusted Gemini Vision AI raw extraction output.
 * NO per-field .catch() statements are used so that schema validation failures
 * (e.g. invalid event types, wrong data types, confidence out of 0-1 range)
 * correctly cause safeParse() to fail with schema_valid = false.
 */
export const ExternalScreenshotExtractionSchema = z.object({
  detected_event_type: ExternalScreenshotEventEnum.nullable(),
  event_timestamp: z.string().nullable().optional(),
  external_reference: z.string().max(100).nullable().optional(),
  stop_location_name: z.string().max(200).nullable().optional(),
  is_wrong_trip: z.boolean().default(false),
  confidence: z.number().min(0.0).max(1.0),
  notes: z.string().max(1000).nullable().optional(),
  detected_text: z.string().max(1000).nullable().optional(),
}).passthrough();

export interface ExternalScreenshotExtractionResult {
  schema_valid: boolean;
  detected_event_type: ExternalScreenshotEventType | null;
  event_timestamp: string | null;
  external_reference: string | null;
  stop_location_name: string | null;
  is_wrong_trip: boolean;
  confidence: number;
  notes: string | null;
  detected_text: string | null;
  validation_error?: string | null;
}

/**
 * Validate untrusted Gemini raw extraction output strictly against Zod schema.
 * Explicitly distinguishes:
 *   A. VALID EXTRACTION (schema_valid = true, event can be null or a valid milestone)
 *   from
 *   B. INVALID / MALFORMED EXTRACTION (schema_valid = false)
 */
export function validateExternalScreenshotExtraction(rawJson: unknown): ExternalScreenshotExtractionResult {
  const result = ExternalScreenshotExtractionSchema.safeParse(rawJson);
  if (result.success) {
    const data = result.data;
    return {
      schema_valid: true,
      detected_event_type: data.detected_event_type,
      event_timestamp: data.event_timestamp ?? null,
      external_reference: data.external_reference ?? null,
      stop_location_name: data.stop_location_name ?? null,
      is_wrong_trip: Boolean(data.is_wrong_trip),
      confidence: data.confidence,
      notes: data.notes ?? null,
      detected_text: data.detected_text ?? null,
    };
  }

  const issueMsg = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  return {
    schema_valid: false,
    detected_event_type: null,
    event_timestamp: null,
    external_reference: null,
    stop_location_name: null,
    is_wrong_trip: false,
    confidence: 0.0,
    notes: `Raw AI JSON failed schema validation: ${issueMsg}`,
    detected_text: null,
    validation_error: issueMsg,
  };
}
