import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { detectDisease } from '../services/aiClient.js';
import { getDiseaseName } from '../services/diseaseInfo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');

export default async function detectRoutes(fastify) {
  fastify.post('/detect', async (request, reply) => {
    const fileData = await request.file();
    if (!fileData) {
      return reply.status(400).send({ error: 'Vui lòng chọn ảnh' });
    }

    const buffer = await fileData.toBuffer();
    const imageId = randomUUID();

    await fs.writeFile(path.join(uploadsDir, 'original', `${imageId}.jpg`), buffer);

    const result = await detectDisease(buffer, fileData.filename);

    const enrichedDetections = result.detections.map((d) => ({
      ...d,
      displayName: getDiseaseName(d.class),
    }));

    await fs.writeFile(
      path.join(uploadsDir, 'annotated', `${imageId}.jpg`),
      Buffer.from(result.annotated_image_base64, 'base64')
    );

    const groupedByDisease = Object.values(
      enrichedDetections.reduce((acc, d) => {
        if (!acc[d.class]) {
          acc[d.class] = {
            class: d.class,
            displayName: d.displayName,
            count: 0,
            maxConfidence: 0,
          };
        }
        acc[d.class].count += 1;
        acc[d.class].maxConfidence = Math.max(acc[d.class].maxConfidence, d.confidence);
        return acc;
      }, {})
    );

    return reply.view('result.pug', {
      title: 'AgriScan - Kết quả phát hiện',
      annotatedImageUrl: `/uploads/annotated/${imageId}.jpg`,
      detections: groupedByDisease,
      inferenceTimeMs: result.inference_time_ms,
    });
  });
}