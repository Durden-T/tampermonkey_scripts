import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    react(),
    monkey({
      entry: 'src/main.tsx',
      userscript: {
        name: 'LZT Market — LoL Cost/Champion Sort',
        namespace: 'github.com/cyqu/lzt-market',
        description:
          'Aggregate multiple paginated pages of lzt.market LoL listings and sort by price-per-champion (cost-performance).',
        version: '1.0.0',
        author: 'cyqu',
        icon: 'https://lzt.market/favicon.ico',
        match: ['https://lzt.market/riot/league-of-legends*'],
        'run-at': 'document-idle',
        grant: ['GM_setValue', 'GM_getValue'],
      },
    }),
  ],
});
