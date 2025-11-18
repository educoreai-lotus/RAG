/**
 * OpenAI configuration
 */

import OpenAI from 'openai';
import { logger } from '../utils/logger.util.js';

const apiKey = process.env.OPENAI_API_KEY;
const apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';

if (!apiKey) {
  logger.warn('OPENAI_API_KEY not set');
}

const openai = new OpenAI({
  apiKey,
  baseURL: apiUrl,
});

export { openai };






