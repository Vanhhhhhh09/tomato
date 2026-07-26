import fp from 'fastify-plugin';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default fp(async function uploadsPlugin(fastify) {
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../../uploads'),
    prefix: '/uploads/',
    decorateReply: false, // tránh xung đột vì plugin static (frontend/public) đã decorate reply rồi
  });
});