/**
 * Vercel serverless function backing every /api/* route.
 *
 * The [...path] filename is what makes this a catch-all. Routing to it via a
 * rewrite instead would rewrite req.url to the destination, and Nest routes on
 * req.url — so /api/public/cars would arrive as /api and 404.
 *
 * Plain CommonJS on purpose: the platform compiles files in this directory with
 * esbuild, which does not support `emitDecoratorMetadata`. NestJS DI and
 * TypeORM both depend on that metadata, so the API is compiled ahead of time by
 * tsc (`npm --prefix backend run build`) and this file just loads the result.
 */

const { createHandler } = require('../backend/dist/serverless');

module.exports = async function handler(req, res) {
  // Vercel's catch-all only matched a single path segment on its own, so a
  // rewrite carries the deeper ones. Log what actually arrives: Nest routes on
  // req.url, and a rewrite that rewrote it would 404 every nested route.
  if (process.env.API_TRACE === '1') console.log('[api]', req.method, req.url);
  try {
    const app = await createHandler();
    app(req, res);
  } catch (err) {
    // A failed bootstrap (bad DB credentials, missing env) would otherwise
    // surface as an opaque 500 with nothing in the logs.
    console.error('API bootstrap failed:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ statusCode: 500, message: 'API failed to start' }));
  }
};
