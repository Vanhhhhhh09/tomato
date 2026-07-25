import fp from 'fastify-plugin';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default fp(async function staticPlugin(fastify) {
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../../../frontend/public'),
    prefix: '/',
  });
});