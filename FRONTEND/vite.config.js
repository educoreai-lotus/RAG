import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-bot-js',
      closeBundle() {
        // Copy bot.js to dist/embed/ after build
        const distPath = join(process.cwd(), 'dist', 'embed');
        mkdirSync(distPath, { recursive: true });
        copyFileSync(
          join(process.cwd(), 'public', 'bot.js'),
          join(distPath, 'bot.js')
        );
      },
    },
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html',
        embed: './src/embed.jsx',
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Build embed.jsx as bot-bundle.js for embedding
          if (chunkInfo.name === 'embed') {
            return 'embed/bot-bundle.js';
          }
          return 'assets/[name]-[hash].js';
        },
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});




