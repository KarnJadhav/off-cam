import { createReadStream, existsSync } from 'fs';
import { extname, join, resolve } from 'path';
import { createServer } from 'http';

const port = Number(process.env.PORT || 5173);
const distDir = resolve('dist');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const requestedPath = resolve(join(distDir, urlPath === '/' ? 'index.html' : urlPath));
  const filePath = requestedPath.startsWith(distDir) && existsSync(requestedPath) ? requestedPath : join(distDir, 'index.html');

  res.setHeader('Content-Type', types[extname(filePath)] || 'application/octet-stream');
  createReadStream(filePath)
    .on('error', () => {
      res.statusCode = 500;
      res.end('Unable to read file');
    })
    .pipe(res);
}).listen(port, () => {
  console.log(`Off-Cam client running on http://localhost:${port}`);
});
