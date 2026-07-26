import axios from 'axios';
import FormData from 'form-data';
import { config } from '../config/env.js';

export async function detectDisease(buffer, filename) {
  const form = new FormData();
  form.append('image', buffer, { filename });

  const response = await axios.post(`${config.aiServiceUrl}/predict`, form, {
    headers: form.getHeaders(),
    timeout: 15000,
  });

  return response.data;
}