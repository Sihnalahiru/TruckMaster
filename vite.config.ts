import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
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
  '.json': 'application/json',
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
        res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        fs.createReadStream(resolvedPath).pipe(res);
      });
    },
    closeBundle() {
      const distImagesDir = path.resolve(__dirname, 'dist', 'data', 'images');
      const srcImagesDir = path.resolve(dataDir, 'images');
      if (fs.existsSync(srcImagesDir)) {
        fs.mkdirSync(distImagesDir, { recursive: true });
        fs.cpSync(srcImagesDir, distImagesDir, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    serveDataAssetsPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
      manifest: {
        id: '/',
        name: 'TruckMaster SSW Study & CBT',
        short_name: 'TruckMaster',
        description: 'Japan SSW Truck Driver trilingual study library, flashcards, and 15-paper CBT exam platform.',
        theme_color: '#0B4F8A',
        background_color: '#F6F8FB',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/content\/.*\.json$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'truckmaster-content-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\/data\/images\/.*\.(png|jpg|jpeg|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'truckmaster-images-cache',
              expiration: { maxEntries: 250, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
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
