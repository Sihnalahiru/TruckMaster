import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, 'data');

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function serveDataAssetsPlugin(): Plugin {
  return {
    name: 'serve-data-assets',
    configureServer(server) {
      server.middlewares.use('/data', (req, res, next) => {
        if (!req.url) return next();

        const rawPath = req.url.split('?')[0];
        let decodedPath: string;
        try {
          decodedPath = decodeURIComponent(rawPath);
        } catch {
          res.statusCode = 400;
          res.end('Bad Request');
          return;
        }

        const resolvedPath = path.resolve(dataDir, `.${decodedPath}`);
        if (!resolvedPath.startsWith(dataDir + path.sep) && resolvedPath !== dataDir) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }

        if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
          return next();
        }

        const ext = path.extname(resolvedPath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const stat = fs.statSync(resolvedPath);
        const range = req.headers.range;

        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        if (range) {
          const match = /bytes=(\d*)-(\d*)/.exec(range);
          if (match) {
            const start = match[1] ? parseInt(match[1], 10) : 0;
            const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
            if (start >= stat.size || end >= stat.size || start > end) {
              res.statusCode = 416;
              res.setHeader('Content-Range', `bytes */${stat.size}`);
              res.end();
              return;
            }
            res.statusCode = 206;
            res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
            res.setHeader('Content-Length', end - start + 1);
            fs.createReadStream(resolvedPath, { start, end }).pipe(res);
            return;
          }
        }

        res.setHeader('Content-Length', stat.size);
        fs.createReadStream(resolvedPath).pipe(res);
      });
    },
    closeBundle() {
      const distDataDir = path.resolve(__dirname, 'dist', 'data');
      if (fs.existsSync(dataDir)) {
        fs.cpSync(dataDir, distDataDir, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serveDataAssetsPlugin()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: false,
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
  },
});
