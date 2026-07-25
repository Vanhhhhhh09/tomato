import Fastify from 'fastify';
import viewPlugin from './plugins/view.js';
import staticPlugin from './plugins/static.js';
import indexRoutes from './routes/index.js';

export function buildApp() {
  const fastify = Fastify({ logger: true });

  fastify.register(viewPlugin);
  fastify.register(staticPlugin);
  fastify.register(indexRoutes);

  return fastify;
}