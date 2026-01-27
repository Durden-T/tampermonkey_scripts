import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import monkey, { cdn } from 'vite-plugin-monkey';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    monkey({
      entry: 'src/main.tsx',
      userscript: {
        name: 'Discord Thread Monitor',
        namespace: 'discord-thread-monitor',
        version: pkg.version,
        description: 'Monitor Discord forum thread title changes',
        author: 'RageNight',
        match: ['https://discord.com/*'],
        icon: 'https://www.google.com/s2/favicons?sz=64&domain=discord.com',
        grant: 'none',
        'run-at': 'document-end',
      },
      build: {
        externalGlobals: {
          idb: cdn.jsdelivr('idb', 'build/umd.js'),
        },
      },
    }),
  ],
  build: {
    minify: mode === 'development' ? false : 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
}));
