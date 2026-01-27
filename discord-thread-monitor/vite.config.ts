import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import monkey from 'vite-plugin-monkey';
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
        namespace: 'https://github.com/Durden-T/tampermonkey_scripts',
        version: pkg.version,
        description: 'Monitor Discord forum thread title changes',
        author: 'Tyler',
        match: ['https://discord.com/*'],
        icon: 'https://www.google.com/s2/favicons?sz=64&domain=discord.com',
        grant: ['GM_getValue', 'GM_setValue'],
        'run-at': 'document-end',
        updateURL:
          'https://cdn.jsdelivr.net/gh/Durden-T/tampermonkey_scripts@latest/discord-thread-monitor/dist/discord-thread-monitor.user.js',
        downloadURL:
          'https://cdn.jsdelivr.net/gh/Durden-T/tampermonkey_scripts@latest/discord-thread-monitor/dist/discord-thread-monitor.user.js',
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
