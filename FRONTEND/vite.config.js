import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-bot-js',
      closeBundle() {
        try {
          // Copy bot.js to dist/embed/ after build
          const distPath = join(process.cwd(), 'dist', 'embed');
          const publicBotPath = join(process.cwd(), 'public', 'bot.js');
          const targetBotPath = join(distPath, 'bot.js');
          
          // Create embed directory if it doesn't exist
          mkdirSync(distPath, { recursive: true });
          
          // Check if source file exists
          if (!existsSync(publicBotPath)) {
            console.error('❌ Source file not found:', publicBotPath);
            throw new Error(`bot.js not found in public directory: ${publicBotPath}`);
          }
          
          // Copy bot.js
          copyFileSync(publicBotPath, targetBotPath);
          console.log('✅ Copied bot.js to:', targetBotPath);
        } catch (error) {
          console.error('❌ Error copying bot.js:', error.message);
          throw error;
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Ensure relative paths for assets when building embed bundle
    // This allows bot-bundle.js to correctly resolve ../assets/ paths
    assetsDir: 'assets',
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
        // Use relative paths for chunk imports in embed bundle
        // This ensures ../assets/ paths work correctly
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
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




