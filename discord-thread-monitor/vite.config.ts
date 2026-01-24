import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import monkey from 'vite-plugin-monkey';

export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    monkey({
      entry: 'src/main.tsx',
      userscript: {
        name: 'Discord Thread Monitor',
        namespace: 'https://github.com/tyler',
        version: '1.0.0',
        description: 'Monitor Discord forum thread title changes',
        author: 'Tyler',
        match: ['https://discord.com/*'],
        icon: 'https://www.google.com/s2/favicons?sz=64&domain=discord.com',
        grant: ['GM_getValue', 'GM_setValue'],
        'run-at': 'document-end',
      }
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
  },
}));
