/**
 * AccountRelay Worker entry point.
 *
 * The Durable Object is accessed via binding from other workers
 * (e.g., signal-ingestion). Direct HTTP to this worker returns 404.
 */

export { AccountRelay } from './AccountRelay.js';

export default {
  async fetch(): Promise<Response> {
    return new Response('Not Found — AccountRelay DO is accessed via binding, not direct HTTP.', {
      status: 404,
    });
  },
} satisfies ExportedHandler;
