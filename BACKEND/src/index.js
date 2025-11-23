/**
 * Application entry point
 */

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware.js';
import { logger } from './utils/logger.util.js';
import queryRoutes from './routes/query.routes.js';
import microserviceSupportRoutes from './routes/microserviceSupport.routes.js';
import recommendationsRoutes from './routes/recommendations.routes.js';
import knowledgeGraphRoutes from './routes/knowledgeGraph.routes.js';
import diagnosticsRoutes from './routes/diagnostics.routes.js';

// Get directory paths for serving static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const frontendDistPath = path.join(rootDir, 'FRONTEND', 'dist');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
// Support multiple origins (localhost for dev, Vercel for production)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.FRONTEND_VERCEL_URL,
].filter(Boolean); // Remove null/undefined values

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Log for debugging
      logger.warn('CORS blocked origin:', origin);
      logger.info('Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint - API information
app.get('/', (req, res) => {
  res.json({
    service: 'RAG Microservice',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      query: '/api/v1/query',
      assessmentSupport: '/api/assessment/support',
      devlabSupport: '/api/devlab/support',
      recommendations: '/api/v1/personalized/recommendations/:userId',
      skillProgress: '/api/v1/knowledge/progress/user/:userId/skill/:skillId',
      diagnostics: '/api/debug/embeddings-status',
      embedWidget: '/embed/bot.js',
      embedBundle: '/embed/bot-bundle.js',
    },
    documentation: 'https://github.com/your-repo/RAG_microservice',
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'rag-microservice' });
});

// Handle common browser requests to prevent 404 spam
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nDisallow: /');
});

// Serve embed files (bot.js and bot-bundle.js) for widget integration
// This allows the widget to be embedded in other microservices
const embedPath = path.join(frontendDistPath, 'embed');
if (existsSync(embedPath)) {
  app.use('/embed', express.static(embedPath, {
    setHeaders: (res, filePath) => {
      // Set proper MIME types
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
      // Enable CORS for embed files
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    },
  }));
  logger.info('✅ Embed files serving enabled from:', embedPath);
} else {
  logger.warn('⚠️  Embed files directory not found:', embedPath);
  logger.warn('   Make sure to build the frontend: cd FRONTEND && npm run build');
  // Add a helpful 404 handler for embed routes
  app.use('/embed', (req, res) => {
    res.status(404).json({
      error: {
        message: 'Embed files not found. Please build the frontend first.',
        statusCode: 404,
        hint: 'Run: cd FRONTEND && npm run build',
      },
    });
  });
}

// API Routes
app.use('/api/v1', queryRoutes);
app.use('/api/v1', recommendationsRoutes);
app.use('/api/v1', knowledgeGraphRoutes);
app.use('/api', microserviceSupportRoutes);
app.use('/api/debug', diagnosticsRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Root endpoint: http://localhost:${PORT}/`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Query endpoint: http://localhost:${PORT}/api/v1/query`);
  logger.info(`Assessment support: http://localhost:${PORT}/api/assessment/support`);
  logger.info(`DevLab support: http://localhost:${PORT}/api/devlab/support`);
  logger.info(`Recommendations: http://localhost:${PORT}/api/v1/personalized/recommendations/:userId`);
  logger.info(`Skill progress: http://localhost:${PORT}/api/v1/knowledge/progress/user/:userId/skill/:skillId?tenant_id=dev.educore.local`);
  logger.info(`Diagnostics: http://localhost:${PORT}/api/debug/embeddings-status`);
  logger.info(`Vector search test: http://localhost:${PORT}/api/debug/test-vector-search?query=test`);
  logger.info(`Embed widget: http://localhost:${PORT}/embed/bot.js`);
  logger.info(`Embed bundle: http://localhost:${PORT}/embed/bot-bundle.js`);
  logger.info(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
});




