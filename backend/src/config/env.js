import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000',
};