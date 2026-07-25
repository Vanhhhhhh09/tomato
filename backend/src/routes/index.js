export default async function indexRoutes(fastify) {
  fastify.get('/', async (request, reply) => {
    return reply.view('index.pug', { title: 'AgriScan - Phát hiện bệnh lá cà chua' });
  });
}