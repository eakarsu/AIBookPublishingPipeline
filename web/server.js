const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const publicDir = path.resolve(__dirname, 'public');
const port = Number(process.env.PORT || process.env.FRONTEND_PORT || 3000);
const types = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = path.resolve(publicDir, pathname === '/' ? 'index.html' : pathname.slice(1));
  if (!file.startsWith(`${publicDir}${path.sep}`) && file !== path.join(publicDir, 'index.html')) return res.writeHead(403).end('Forbidden');
  if (!path.extname(file)) file = path.join(publicDir, 'index.html');
  fs.readFile(file, (error, body) => {
    if (error) return res.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; connect-src 'self' http://localhost:* http://127.0.0.1:*; style-src 'self'" });
    res.end(body);
  });
}).listen(port, () => console.log(`Publishing UI listening on http://localhost:${port}`));
