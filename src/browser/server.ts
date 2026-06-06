import { createReadStream } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, normalize, resolve, sep } from 'node:path';

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

export interface StaticServer {
  url: string;
  close(): Promise<void>;
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolveClose, reject) => {
    server.close((error) => error ? reject(error) : resolveClose());
  });
}

export async function startServer(rootDirectory: string): Promise<StaticServer> {
  const root = resolve(rootDirectory);
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url ?? '/', 'http://localhost').pathname
    );
    const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const normalizedPath = normalize(relativePath);
    const filePath = resolve(root, normalizedPath);
    if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    const stream = createReadStream(filePath);
    stream.on('open', () => {
      response.writeHead(200, {
        'Content-Type': MIME_TYPES[extname(filePath).toLowerCase()]
          ?? 'application/octet-stream'
      });
      stream.pipe(response);
    });
    stream.on('error', () => {
      response.writeHead(404);
      response.end('Not found');
    });
  });

  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    await closeServer(server);
    throw new Error('Failed to determine local server address');
  }
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => closeServer(server)
  };
}
