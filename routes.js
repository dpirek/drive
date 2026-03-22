import { serverIndex } from './utils/response.js';

export function registerRoutes(router) {
  router.add('/login', 'GET', serverIndex, 'html', false);
  router.add('/', 'GET', serverIndex, 'html', true);
}
