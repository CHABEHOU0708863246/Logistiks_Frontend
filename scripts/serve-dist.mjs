import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { createGzip } from 'node:zlib';

const root = resolve('dist/Logistiks_Frontend/browser');
const port = Number(process.env.PORT || 4300);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
};

const compressible = new Set(['.html', '.js', '.mjs', '.css', '.json', '.webmanifest', '.svg', '.txt']);

createServer((request, response) => {
  const url = new URL(request.url || '/', `http://localhost:${port}`);
  let filePath = normalize(join(root, decodeURIComponent(url.pathname)));

  if (!filePath.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    const asIndex = join(filePath, 'index.html');
    if (existsSync(asIndex)) {
      filePath = asIndex;
    } else {
      filePath = join(root, 'index.html');
    }
  }

  const ext = extname(filePath).toLowerCase();
  const headers = {
    'Content-Type': types[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  };

  const acceptsGzip = String(request.headers['accept-encoding'] || '').includes('gzip');
  if (acceptsGzip && compressible.has(ext)) {
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
    response.writeHead(200, headers);
    createReadStream(filePath).pipe(createGzip()).pipe(response);
    return;
  }

  headers['Content-Length'] = statSync(filePath).size;
  response.writeHead(200, headers);
  createReadStream(filePath).pipe(response);
}).listen(port, () => {
  console.log(`serve-dist: http://localhost:${port} (gzip, SPA fallback)`);
});
