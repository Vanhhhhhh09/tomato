import fp from 'fastify-plugin';
import fastifyView from '@fastify/view';
import pug from 'pug';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default fp(async function viewPlugin(fastify) {
  fastify.register(fastifyView, {
    engine: { pug },
    root: path.join(__dirname, '../../../frontend/views'),
  });
});