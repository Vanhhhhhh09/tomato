import { getPaginatedDetections, getDetectionById } from '../models/detection.js';

export default async function historyRoutes(fastify) {
  fastify.get('/history', async (request, reply) => {
    const page = Math.max(1, parseInt(request.query.page, 10) || 1);
    const { records, totalPages, currentPage } = await getPaginatedDetections(fastify, page, 12);

    console.log('DB name:', fastify.mongo.db.databaseName);
    console.log('Số record lấy được:', records.length);
    console.log('Tổng số trang:', totalPages);

    return reply.view('history.pug', {
      title: 'AgriScan - Lịch sử phát hiện',
      activeNav: 'history',
      records,
      currentPage,
      totalPages,
    });
  });

  fastify.get('/history/:id', async (request, reply) => {
    const record = await getDetectionById(fastify, request.params.id);

    if (!record) {
      return reply.redirect('/history');
    }

    return reply.view('result.pug', {
      title: 'AgriScan - Chi tiết lịch sử',
      activeNav: 'history',
      annotatedImageUrl: record.annotatedImagePath,
      detections: record.detections,
      inferenceTimeMs: record.inferenceTimeMs,
    });
  });
}