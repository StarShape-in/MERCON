/**
 * Centralized structured logger (Pino).
 * - Development: pretty, colorized, human-readable output.
 * - Production: single-line JSON (ready for log aggregators).
 *
 * Usage:  import { logger } from '../utils/logger';
 *         logger.info({ userId }, 'User logged in');
 *         logger.error({ err }, 'Something failed');
 */
import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  // Without this, passing a raw Error under the `err` key (the pattern every
  // controller's catch block uses: logger.error({ err: error }, '...')) prints
  // as an empty/opaque object instead of the real message and stack — pino
  // doesn't serialize Error instances by default. This is what let a real bug
  // (an invalid TripStatus enum value crashing every trip query) show up in
  // the API response as just "Failed to fetch trips" with nothing in the
  // console to explain why.
  serializers: {
    err: pino.stdSerializers.err,
  },
  // Pretty transport only in development; production stays as raw JSON on stdout.
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      },
});
