const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = 3000;
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

http.createServer((request, response) => {
  const requestPath = decodeURIComponent(request.url.split('?')[0]);
  const routes = {
    '/': 'index.html', '/blog': 'blog.html', '/admin': 'admin/index.html',
    '/admin/login': 'admin/login.html', '/admin/noticias/nova': 'admin/editor.html'
  };
  let relativePath = routes[requestPath] || requestPath.replace(/^\/+/, '');
  if (/^\/blog\/[^/]+\/?$/.test(requestPath)) relativePath = 'post.html';
  if (/^\/admin\/noticias\/[^/]+\/editar\/?$/.test(requestPath)) relativePath = 'admin/editor.html';
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(root + path.sep) && filePath !== path.join(root, 'index.html')) {
    response.writeHead(403).end('Acesso negado');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Arquivo não encontrado');
      return;
    }

    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(response);
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`Site disponível em http://localhost:${port}`);
});
