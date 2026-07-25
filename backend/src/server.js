import { buildApp } from './app.js';
import { config } from './config/env.js';

const fastify = buildApp();

fastify.listen({ port: config.port, host: config.host }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Server đang chạy tại ${address}`);
});