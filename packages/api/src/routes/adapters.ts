import type { FastifyInstance } from 'fastify';
import { getRegisteredGameTypes } from '../adapters/registry.js';

export default async function adapterRoutes(app: FastifyInstance) {
  app.get('/api/adapters/game-types', async () => {
    return getRegisteredGameTypes();
  });
}
