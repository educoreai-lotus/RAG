import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, existsSync, readdirSync, renameSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-bot-js',
      closeBundle() {
        try {
          // Copy bot.js and helper to dist/embed/ after build
          const distPath = join(process.cwd(), 'dist', 'embed');
          const publicBotPath = join(process.cwd(), 'public', 'bot.js');
          const helperPath = join(process.cwd(), 'public', 'chatbot-init-helper.js');
          const targetBotPath = join(distPath, 'bot.js');
          const targetHelperPath = join(distPath, 'chatbot-init-helper.js');
          
          // Create embed directory if it doesn't exist
          mkdirSync(distPath, { recursive: true });
          
          // Check if source files exist
          if (!existsSync(publicBotPath)) {
            console.error('❌ Source file not found:', publicBotPath);
            throw new Error(`bot.js not found in public directory: ${publicBotPath}`);
          }
          
          // Copy bot.js
          copyFileSync(publicBotPath, targetBotPath);
          console.log('✅ Copied bot.js to:', targetBotPath);
          
          // Copy helper script if it exists
          if (existsSync(helperPath)) {
            copyFileSync(helperPath, targetHelperPath);
            console.log('✅ Copied chatbot-init-helper.js to:', targetHelperPath);
          } else {
            console.warn('⚠️ Helper script not found:', helperPath);
          }
          
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // Rename embed CSS file to bot-styles.css for Shadow DOM
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          const assetsPath = join(process.cwd(), 'dist', 'assets');
          if (existsSync(assetsPath)) {
            const files = readdirSync(assetsPath);
            // Find CSS file that starts with 'embed'
            const embedCssFile = files.find(f => f.startsWith('embed') && f.endsWith('.css'));
            if (embedCssFile) {
              const oldPath = join(assetsPath, embedCssFile);
              const newPath = join(distPath, 'bot-styles.css');
              copyFileSync(oldPath, newPath);
              console.log('✅ Copied embed CSS to bot-styles.css:', newPath);
            } else {
              // Also check if CSS is in embed directory
              const embedFiles = existsSync(distPath) ? readdirSync(distPath) : [];
              const embedCssInEmbed = embedFiles.find(f => f.startsWith('embed') && f.endsWith('.css'));
              if (embedCssInEmbed) {
                const oldPath = join(distPath, embedCssInEmbed);
                const newPath = join(distPath, 'bot-styles.css');
                renameSync(oldPath, newPath);
                console.log('✅ Renamed embed CSS to bot-styles.css:', newPath);
              } else {
                console.warn('⚠️ Embed CSS file not found. Make sure embed.jsx imports CSS.');
              }
            }
          }
        } catch (error) {
          console.error('❌ Error copying bot files:', error.message);
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
        // Extract CSS to separate file for shadow DOM
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            // For embed entry, extract CSS to bot-styles.css
            if (assetInfo.names && assetInfo.names.includes('embed')) {
              return 'embed/bot-styles.css';
            }
          }
          return 'assets/[name]-[hash].[ext]';
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




