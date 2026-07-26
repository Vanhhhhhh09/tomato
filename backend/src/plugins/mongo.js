import fp from 'fastify-plugin';
import fastifyMongo from '@fastify/mongodb';
import { config } from '../config/env.js';

export default fp(async function mongoPlugin(fastify) {
  fastify.register(fastifyMongo, {
    forceClose: true,
    url: config.mongoUri,
  });
});