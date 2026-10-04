import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : join(dir, entry.name)))).flat();
}
const paths = (await walk('dist')).filter(path => !path.endsWith('sw.js') && !path.endsWith('_headers')).sort();
const hash = createHash('sha256');
for (const path of paths) hash.update(await readFile(path));
const version = hash.digest('hex').slice(0, 12);
const urls = paths.map(path => '/' + path.slice(5)).map(path => path === '/index.html' ? '/' : path);
await writeFile('dist/sw.js', `
const CACHE = 'currency-app-${version}';
const ASSETS = ${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('currency-app-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match('/'))));
  } else {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
`);
console.log(`Offline shell: ${urls.length} assets, version ${version}`);
