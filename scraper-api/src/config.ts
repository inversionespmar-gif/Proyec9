import dotenv from 'dotenv';
import { ScraperConfig } from './types/media';

dotenv.config();

function safeParseInt(value: string | undefined, defaultVal: number): number {
  if (!value) return defaultVal;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultVal : parsed;
}

const missing = (key: string) => { throw new Error(`Missing required env var: ${key}`); };

export const config: ScraperConfig = {
  port: safeParseInt(process.env.PORT, 3000),
  targetUrl: process.env.TARGET_URL || missing('TARGET_URL'),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  apiKey: process.env.API_KEY || missing('API_KEY'),
  cacheTtlMetadata: safeParseInt(process.env.CACHE_TTL_METADATA, 21600),
  cacheTtlStream: safeParseInt(process.env.CACHE_TTL_STREAM, 1800),
};
