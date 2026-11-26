
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

import { detectDisease } from '../services/aiClient.js';
import { saveDetection } from '../models/detection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');

const diseaseNames = {
  bacterial_spot: 'Bệnh đốm vi khuẩn',
  early_blight: 'Bệnh cháy lá sớm',
  late_blight: 'Bệnh mốc sương',
  mold_leaf: 'Bệnh mốc lá',
  mosaic_virus: 'Bệnh khảm lá do virus',
  septoria_leaf_spot: 'Bệnh đốm lá Septoria',
  spider_mites_leaf: 'Bệnh nhện đỏ',
  yellow_leaf_curl_virus: 'Bệnh xoăn vàng lá do virus'
};
export function getDiseaseName(className) {
  return diseaseNames[className] || className;
}
export default async function detectRoutes(fastify) {
  fastify.post('/detect', async (request, reply) => {
    try {
      // 1. Nhận ảnh upload
      const fileData = await request.file();

      if (!fileData) {
        return reply.status(400).send({
          error: 'Vui lòng chọn ảnh'
        });
      }

      const buffer = await fileData.toBuffer();
      const imageId = randomUUID();

      // 2. Tạo thư mục nếu chưa tồn tại
      const originalDir = path.join(uploadsDir, 'original');
      const annotatedDir = path.join(uploadsDir, 'annotated');

      await fs.mkdir(originalDir, { recursive: true });
      await fs.mkdir(annotatedDir, { recursive: true });

      // 3. Lưu ảnh gốc
      await fs.writeFile(
        path.join(originalDir, `${imageId}.jpg`),
        buffer
      );

      // 4. Gửi ảnh sang Flask AI
      const result = await detectDisease(
        buffer,
        fileData.filename
      );

      if (!result || !result.success) {
        throw new Error(result?.error || 'AI xử lý ảnh thất bại');
      }

      // 5. Kiểm tra ảnh Base64
      const imageBase64 = result.annotated_image_base64;

      if (!imageBase64) {
        throw new Error('AI không trả về ảnh kết quả');
      }

      // Tách phần data:image/jpeg;base64, nếu có
      const pureBase64 = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;

      // Giải mã Base64 thành ảnh JPEG
      const annotatedBuffer = Buffer.from(
        pureBase64,
        'base64'
      );

      if (!annotatedBuffer.length) {
        throw new Error('Ảnh kết quả sau giải mã bị rỗng');
      }

      // 6. Lưu ảnh đã tô màu lá
      await fs.writeFile(
        path.join(annotatedDir, `${imageId}.jpg`),
        annotatedBuffer
      );

      fastify.log.info({
        imageId,
        annotatedImageSize: annotatedBuffer.length,
        totalLeaves: result.total_leaves,
        totalDetections: result.total_detections
      }, 'AI image saved successfully');

      // 7. Chuyển đổi thông tin bệnh
      const enrichedDetections = (result.detections || []).map((d) => ({
        ...d,
        className: d.class,
        displayName: getDiseaseName(d.class),
      }));

      // 8. Nhóm kết quả theo loại bệnh
      const groupedByDisease = Object.values(
        enrichedDetections.reduce((acc, d) => {
          if (!acc[d.class]) {
            acc[d.class] = {
              class: d.class,
              className: d.class,
              displayName: d.displayName,
              count: 0,
              maxConfidence: 0,
            };
          }

          acc[d.class].count += 1;

          acc[d.class].maxConfidence = Math.max(
            acc[d.class].maxConfidence,
            d.confidence
          );

          return acc;
        }, {})
      );

      // 9. Đường dẫn ảnh
      const originalImagePath =
        `/uploads/original/${imageId}.jpg`;

      const annotatedImagePath =
        `/uploads/annotated/${imageId}.jpg`;

      // 10. Lưu lịch sử
      await saveDetection(fastify, {
        originalImagePath,
        annotatedImagePath,
        detections: groupedByDisease,
        inferenceTimeMs: result.total_time_ms,
      });

      // 11. Trả kết quả về Pug
      return reply.view('result.pug', {
        title: 'AgriScan - Kết quả phát hiện',
        activeNav: 'detect',

        annotatedImageUrl: annotatedImagePath,

        detections: groupedByDisease,

        inferenceTimeMs: result.total_time_ms,

        totalLeaves: result.total_leaves,
        diseasedLeaves: result.diseased_leaves,
        notDetectedLeaves: result.not_detected_leaves,
        totalDetections: result.total_detections,
      });

    } catch (err) {
      fastify.log.error(err);

      return reply.status(500).view('error.pug', {
        title: 'AgriScan - Có lỗi xảy ra',
        activeNav: 'detect',
        message: 'Hệ thống AI đang bận hoặc gặp sự cố, vui lòng thử lại sau ít phút.',
      });
    }
  });
}
