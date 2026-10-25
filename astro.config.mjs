// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
  // Built assets live under /assets/ instead of the default /_astro/.
  build: { assets: 'assets' },
  vite: {
    plugins: [tailwindcss()],
    environments: {
      // Hash-only names for browser chunks, so no file is named after a .astro component.
      client: {
        build: {
          rollupOptions: {
            output: {
              entryFileNames: 'assets/[hash].js',
              chunkFileNames: 'assets/[hash].js',
              assetFileNames: 'assets/[hash][extname]',
            },
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  },
});
