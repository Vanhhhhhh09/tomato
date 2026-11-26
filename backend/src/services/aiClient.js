import axios from 'axios';
import FormData from 'form-data';
import { config } from '../config/env.js';

// export async function detectDisease(buffer, filename) {
//   const form = new FormData();

//   form.append('image', buffer, { filename });

//   const response = await axios.post(
//     `${config.aiServiceUrl}/predict`,
//     form,
//     {
//       headers: form.getHeaders(),
//       timeout: 180000,
//       maxBodyLength: Infinity,
//       maxContentLength: Infinity,
//     }
//   );

//   return response.data;
// }
export async function detectDisease(buffer, filename) {
  const form = new FormData();
  form.append('image', buffer, { filename });

  const response = await axios.post(
    `${config.aiServiceUrl}/predict`,
    form,
    {
      headers: form.getHeaders(),
      timeout: 180000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );

  console.log('AI RESPONSE:', {
    success: response.data.success,
    total_leaves: response.data.total_leaves,
    total_detections: response.data.total_detections,
    has_image: !!response.data.annotated_image_base64,
  });

  return response.data;
}