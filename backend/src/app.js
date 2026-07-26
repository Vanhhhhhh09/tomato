import Fastify from 'fastify';
import viewPlugin from './plugins/view.js';
import staticPlugin from './plugins/static.js';
import uploadsPlugin from './plugins/uploads.js';
import multipartPlugin from './plugins/multipart.js';
import indexRoutes from './routes/index.js';
import detectRoutes from './routes/detect.js';

export function buildApp() {
  const fastify = Fastify({ logger: true });

  fastify.register(viewPlugin);
  fastify.register(staticPlugin);
  fastify.register(uploadsPlugin);
  fastify.register(multipartPlugin);

  fastify.register(indexRoutes);
  fastify.register(detectRoutes);

  return fastify;
}