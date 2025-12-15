/**
 * Application entry point
 */

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readdirSync } from 'fs';
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware.js';
import { logger } from './utils/logger.util.js';
import { isCoordinatorAvailable } from './clients/coordinator.client.js';
import { startScheduledSync } from './jobs/scheduledSync.js';
import queryRoutes from './routes/query.routes.js';
import microserviceSupportRoutes from './routes/microserviceSupport.routes.js';
import recommendationsRoutes from './routes/recommendations.routes.js';
import knowledgeGraphRoutes from './routes/knowledgeGraph.routes.js';
import diagnosticsRoutes from './routes/diagnostics.routes.js';
import contentRoutes from './routes/content.routes.js';
import authRoutes from './routes/auth.routes.js';

// Get directory paths for serving static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const frontendDistPath = path.join(rootDir, 'FRONTEND', 'dist');

// Log build information for debugging
logger.info('🔍 Checking frontend build files...');
logger.info(`   Root directory: ${rootDir}`);
logger.info(`   Frontend dist path: ${frontendDistPath}`);
logger.info(`   Frontend dist exists: ${existsSync(frontendDistPath)}`);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
// Support multiple origins (localhost for dev, Vercel for production)

// Get allowed origins from environment variable or use defaults
const envAllowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

// Build allowed origins list
const allowedOrigins = [
  // Local development
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'http://localhost:8080',
  // Main Vercel deployment
  'https://rag-git-main-educoreai-lotus.vercel.app',
  // Environment variables
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.FRONTEND_VERCEL_URL,
  process.env.VERCEL ? `https://${process.env.VERCEL}` : null,
  // From environment variable
  ...envAllowedOrigins,
].filter(Boolean); // Remove null/undefined values

// Helper function to check if origin matches a pattern (supports wildcards)
function matchesPattern(origin, pattern) {
  if (pattern.includes('*')) {
    // Handle wildcard (e.g., *.vercel.app)
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\./g, '\\.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(origin);
  }
  return pattern === origin;
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list (exact match)
    if (allowedOrigins.some(allowed => allowed === origin)) {
      logger.debug('CORS: Allowing exact match origin:', origin);
      return callback(null, true);
    }
    
    // Check if origin matches any wildcard pattern
    const matchesWildcard = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        return matchesPattern(origin, allowed);
      }
      return false;
    });
    
    if (matchesWildcard) {
      logger.info('CORS: Allowing wildcard match origin:', origin);
      return callback(null, true);
    }
    
    // Always allow Vercel deployments (any *.vercel.app)
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
      logger.info('CORS: Allowing Vercel origin:', origin);
      return callback(null, true);
    }
    
    // Log blocked origin for debugging
    logger.warn('CORS blocked origin:', origin);
    logger.info('Allowed origins:', allowedOrigins);
    logger.info('💡 To allow this origin, add it to ALLOWED_ORIGINS environment variable in Railway');
    logger.info('💡 Format: ALLOWED_ORIGINS=https://example.com,https://*.example.com');
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 204,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-Id', 'X-Tenant-Id', 'X-Source', 'X-Embed-Secret'],
  exposedHeaders: ['Content-Type', 'Authorization', 'Content-Range', 'X-Content-Range'],
  preflightContinue: false, // End preflight requests immediately
  maxAge: 600, // Cache preflight requests for 10 minutes (reduced from 24 hours)
};

// ═══════════════════════════════════════════════════════
// CORS CONFIGURATION - MUST BE FIRST!
// ═══════════════════════════════════════════════════════

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicit OPTIONS handler for all routes (preflight)
app.options('*', cors(corsOptions));

// ═══════════════════════════════════════════════════════
// ADDITIONAL SAFETY: Manual CORS headers middleware
// ═══════════════════════════════════════════════════════

app.use((req, res, next) => {
  try {
    const origin = req.headers.origin;
    
    // Allow Vercel origins - set headers for all requests
    if (origin && /^https:\/\/.*\.vercel\.app$/.test(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,X-User-Id,X-Tenant-Id,X-Source,X-Embed-Secret,Accept,Origin');
      res.header('Access-Control-Expose-Headers', 'Content-Range,X-Content-Range');
    }
    
    // Handle OPTIONS preflight requests explicitly (only if not handled by routes)
    if (req.method === 'OPTIONS') {
      // Let route handlers handle OPTIONS first, but ensure headers are set
      // Don't return early - let it continue to route handlers
      // If no route handles it, the explicit app.options('*') will catch it
    }
    
    next();
  } catch (error) {
    // If CORS middleware fails, log but don't crash
    logger.error('[CORS Middleware] Error:', error);
    next();
  }
});

// ═══════════════════════════════════════════════════════
// DEBUGGING: Log all requests (for CORS debugging)
// ═══════════════════════════════════════════════════════

app.use((req, res, next) => {
  try {
    if (req.path === '/auth/me' || req.method === 'OPTIONS') {
      const corsOrigin = res.getHeader('access-control-allow-origin');
      const corsCreds = res.getHeader('access-control-allow-credentials');
      logger.debug(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
        origin: req.headers.origin,
        'access-control-allow-origin': corsOrigin || 'not-set',
        'access-control-allow-credentials': corsCreds || 'not-set',
      });
    }
  } catch (error) {
    // If logging fails, don't crash - just continue
    logger.error('[Debug Middleware] Error:', error);
  }
  next();
});

// ═══════════════════════════════════════════════════════
// OTHER MIDDLEWARE (AFTER CORS)
// ═══════════════════════════════════════════════════════

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
      auth: '/auth/me',
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
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    service: 'rag-microservice',
    timestamp: new Date().toISOString(),
    dependencies: {}
  };
  
  // Check Coordinator gRPC connection
  try {
    const isAvailable = await isCoordinatorAvailable();
    
    health.dependencies.coordinator = isAvailable ? 'ok' : 'down';
    
    if (!isAvailable) {
      health.status = 'degraded';
    }
  } catch (error) {
    health.dependencies.coordinator = 'error';
    health.dependencies.coordinator_error = error.message;
    health.status = 'degraded';
  }
  
  // Check if private key is configured
  health.dependencies.private_key = process.env.RAG_PRIVATE_KEY ? 'configured' : 'missing';
  if (!process.env.RAG_PRIVATE_KEY) {
    health.status = 'degraded';
  }
  
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
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
const botJsPath = path.join(embedPath, 'bot.js');
const botBundlePath = path.join(embedPath, 'bot-bundle.js');

// Check if embed directory and files exist
const embedDirExists = existsSync(embedPath);
const botJsExists = existsSync(botJsPath);
const botBundleExists = existsSync(botBundlePath);

if (embedDirExists && (botJsExists || botBundleExists)) {
  // Serve static files with error handling
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
    // Add error handling for missing files
    onError: (err, req, res, next) => {
      logger.error('Error serving embed file:', {
        path: req.path,
        error: err.message,
      });
      next(err);
    },
  }));
  
  // Add specific route handlers with better error messages
  app.get('/embed/bot.js', (req, res, next) => {
    if (!botJsExists) {
      logger.error('bot.js not found at:', botJsPath);
      return res.status(500).json({
        error: {
          message: 'bot.js file not found',
          statusCode: 500,
          hint: 'Make sure FRONTEND/dist/embed/bot.js exists. Run: cd FRONTEND && npm run build',
          path: botJsPath,
        },
      });
    }
    next();
  });

  app.get('/embed/bot-bundle.js', (req, res, next) => {
    if (!botBundleExists) {
      logger.error('bot-bundle.js not found at:', botBundlePath);
      return res.status(500).json({
        error: {
          message: 'bot-bundle.js file not found',
          statusCode: 500,
          hint: 'Make sure FRONTEND/dist/embed/bot-bundle.js exists. Run: cd FRONTEND && npm run build',
          path: botBundlePath,
        },
      });
    }
    next();
  });

  logger.info('✅ Embed files serving enabled from:', embedPath);
  logger.info(`   bot.js: ${botJsExists ? '✅' : '❌'} (${botJsPath})`);
  logger.info(`   bot-bundle.js: ${botBundleExists ? '✅' : '❌'} (${botBundlePath})`);
  
  // List all files in embed directory for debugging
  if (embedDirExists) {
    try {
      const files = readdirSync(embedPath);
      logger.info(`   Files in embed directory: ${files.join(', ') || 'none'}`);
    } catch (err) {
      logger.warn('   Could not list embed directory files:', err.message);
    }
  }
} else {
  logger.warn('⚠️  Embed files directory or files not found');
  logger.warn('   Directory exists:', embedDirExists, '(', embedPath, ')');
  logger.warn('   bot.js exists:', botJsExists, '(', botJsPath, ')');
  logger.warn('   bot-bundle.js exists:', botBundleExists, '(', botBundlePath, ')');
  logger.warn('   Make sure to build the frontend: cd FRONTEND && npm run build');
  
  // Add a helpful error handler for embed routes
  app.use('/embed', (req, res) => {
    const requestedFile = req.path === '/bot.js' ? 'bot.js' : req.path === '/bot-bundle.js' ? 'bot-bundle.js' : 'file';
    logger.error(`Embed ${requestedFile} requested but not found:`, {
      path: req.path,
      embedDirExists,
      botJsExists,
      botBundleExists,
      embedPath,
    });
    
    res.status(500).json({
      error: {
        message: `Embed ${requestedFile} not found`,
        statusCode: 500,
        hint: 'Make sure to build the frontend: cd FRONTEND && npm run build',
        details: {
          embedDirectory: embedPath,
          embedDirectoryExists: embedDirExists,
          botJsExists,
          botBundleExists,
        },
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
app.use('/api/debug', contentRoutes);
app.use('/auth', authRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server - bind to 0.0.0.0 for Railway/cloud deployments
const HOST = process.env.HOST || '0.0.0.0';

// Error handling for server startup
let server;
try {
  server = app.listen(PORT, HOST, () => {
    logger.info(`✅ Server running on ${HOST}:${PORT}`);
    logger.info(`Root endpoint: http://${HOST}:${PORT}/`);
    logger.info(`Health check: http://${HOST}:${PORT}/health`);
    logger.info(`Query endpoint: http://${HOST}:${PORT}/api/v1/query`);
    logger.info(`Auth endpoint: http://${HOST}:${PORT}/auth/me`);
    logger.info(`Assessment support: http://${HOST}:${PORT}/api/assessment/support`);
    logger.info(`DevLab support: http://${HOST}:${PORT}/api/devlab/support`);
    logger.info(`Recommendations: http://${HOST}:${PORT}/api/v1/personalized/recommendations/:userId`);
    logger.info(`Skill progress: http://${HOST}:${PORT}/api/v1/knowledge/progress/user/:userId/skill/:skillId?tenant_id=dev.educore.local`);
    logger.info(`Diagnostics: http://${HOST}:${PORT}/api/debug/embeddings-status`);
    logger.info(`Vector search test: http://${HOST}:${PORT}/api/debug/test-vector-search?query=test`);
    logger.info(`Embed widget: http://${HOST}:${PORT}/embed/bot.js`);
    logger.info(`Embed bundle: http://${HOST}:${PORT}/embed/bot-bundle.js`);
    logger.info(`CORS allowed origins: ${allowedOrigins.join(', ') || 'none configured'}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Start scheduled batch sync job
    try {
      startScheduledSync();
      logger.info('✅ Scheduled batch sync job started');
    } catch (error) {
      logger.warn('⚠️  Failed to start scheduled batch sync job', {
        error: error.message,
        hint: 'Install node-cron: npm install node-cron',
      });
    }
    
    // Signal that server is ready (for Railway health checks)
    if (process.send) {
      process.send('ready');
    }
  });
} catch (error) {
  logger.error('❌ Failed to start server:', error);
  logger.error('Error details:', {
    message: error.message,
    stack: error.stack,
    port: PORT,
    host: HOST,
  });
  process.exit(1);
}

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use`);
    logger.error('💡 Try changing the PORT environment variable');
  } else {
    logger.error('❌ Server error:', error);
  }
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production - let the server continue running
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  // Stop scheduled sync job
  import('./jobs/scheduledSync.js')
    .then(({ stopScheduledSync }) => {
      stopScheduledSync();
    })
    .catch(() => {
      // Ignore errors during shutdown
    });
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  // Stop scheduled sync job
  import('./jobs/scheduledSync.js')
    .then(({ stopScheduledSync }) => {
      stopScheduledSync();
    })
    .catch(() => {
      // Ignore errors during shutdown
    });
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});




