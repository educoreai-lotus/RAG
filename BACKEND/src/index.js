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
import { methodNotAllowedHandler } from './middleware/405-handler.middleware.js';
import { globalOptionsHandler, requestLogger } from './middleware/method-handler.middleware.js';
import { criticalDebugLogger } from './middleware/debug-logger.middleware.js';
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
    // ✅ CRITICAL FIX: Allow requests with no origin
    if (!origin) {
      logger.info('[CORS] Request with no origin - allowing');
      return callback(null, true);
    }
    
    // List of explicitly allowed origins
    const explicitAllowedOrigins = [
      'https://rag-git-main-educoreai-lotus.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:8080',
    ];
    
    // Check if origin matches exactly
    if (explicitAllowedOrigins.includes(origin)) {
      logger.info('[CORS] Allowed origin:', origin);
      return callback(null, true);
    }
    
    // Check if it's a Vercel preview deployment
    if (/\.vercel\.app$/.test(origin)) {
      logger.info('[CORS] Allowed Vercel preview:', origin);
      return callback(null, true);
    }
    
    // Check environment variable origins
    const envOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
    if (envOrigins.some(allowed => origin.includes(allowed) || allowed === origin)) {
      logger.info('[CORS] Allowed from env:', origin);
      return callback(null, true);
    }
    
    // Check if origin is in the dynamic allowedOrigins list (from earlier in code)
    if (allowedOrigins.some(allowed => allowed === origin)) {
      logger.info('[CORS] Allowed from dynamic list:', origin);
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
      logger.info('[CORS] Allowed wildcard match:', origin);
      return callback(null, true);
    }
    
    // If we get here, log it
    logger.warn('[CORS] BLOCKED origin:', origin);
    logger.info('[CORS] Allowed origins:', [...explicitAllowedOrigins, ...allowedOrigins].join(', '));
    
    // ⚠️ FOR TESTING: Allow anyway (remove this after testing)
    logger.warn('[CORS] Allowing blocked origin for testing:', origin);
    return callback(null, true);
    
    // Production: Uncomment this to actually block
    // callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-User-Id',
    'X-Tenant-Id',
    'X-Source',
    'X-Embed-Secret',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// ═══════════════════════════════════════════════════════
// CRITICAL: Raw request logger - VERY FIRST middleware
// This catches ALL requests before anything else
// ═══════════════════════════════════════════════════════
app.use((req, res, next) => {
  console.log('🌍 RAILWAY REQUEST INFO:');
  console.log('  Original URL:', req.originalUrl);
  console.log('  Base URL:', req.baseUrl);
  console.log('  Path:', req.path);
  console.log('  Method:', req.method);
  console.log('  Protocol:', req.protocol);
  console.log('  Hostname:', req.hostname);
  console.log('  X-Forwarded-For:', req.headers['x-forwarded-for'] || 'N/A');
  console.log('  X-Forwarded-Proto:', req.headers['x-forwarded-proto'] || 'N/A');
  console.log('  X-Forwarded-Host:', req.headers['x-forwarded-host'] || 'N/A');
  console.log('🎯 RAW REQUEST:', req.method, req.originalUrl || req.url);
  console.log('🎯 RAW PATH:', req.path);
  console.log('🎯 RAW ORIGIN:', req.headers.origin || 'NO ORIGIN');
  next();
});

// ═══════════════════════════════════════════════════════
// CRITICAL: Early OPTIONS handler - BEFORE CORS
// This MUST handle OPTIONS requests before CORS middleware
// If OPTIONS fails, browser never sends POST!
// ═══════════════════════════════════════════════════════
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log('🚨 OPTIONS REQUEST CAUGHT:', req.path, req.originalUrl);
    logger.info('🚨 OPTIONS PREFLIGHT REQUEST', {
      path: req.path,
      originalUrl: req.originalUrl,
      origin: req.headers.origin,
      'access-control-request-method': req.headers['access-control-request-method'],
      'access-control-request-headers': req.headers['access-control-request-headers'],
    });

    // Set CORS headers for OPTIONS
    const origin = req.headers.origin || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-User-Id, X-Tenant-Id, X-Source, X-Embed-Secret, X-Requested-With, Accept, Origin'
    );
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '600');

    console.log('✅ OPTIONS RESPONSE SENT: 204');
    return res.sendStatus(204);
  }
  next();
});

// ═══════════════════════════════════════════════════════
// CORS CONFIGURATION - MUST BE AFTER EARLY OPTIONS HANDLER
// ═══════════════════════════════════════════════════════

// Apply CORS middleware
app.use(cors(corsOptions));

// Global OPTIONS handler - handles CORS preflight for all routes
// This MUST be before routes to catch OPTIONS requests early
app.use(globalOptionsHandler);

// Explicit OPTIONS handler for all routes (preflight) - fallback
app.options('*', cors(corsOptions));

// CRITICAL DEBUG LOGGING - Log EVERY request detail
// This MUST be enabled to debug 405 errors
app.use(criticalDebugLogger);

// Request logging middleware - log all incoming requests
if (process.env.LOG_REQUESTS !== 'false') {
  app.use(requestLogger);
}

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

// Serve assets directory for bot-bundle.js dependencies
// bot-bundle.js imports assets using relative paths (../assets/...)
// When served from /embed/bot-bundle.js, these resolve to /assets/...
const assetsPath = path.join(frontendDistPath, 'assets');
const assetsDirExists = existsSync(assetsPath);

if (assetsDirExists) {
  // Serve static assets with CORS enabled
  app.use('/assets', express.static(assetsPath, {
    setHeaders: (res, filePath) => {
      // Set proper MIME types
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (filePath.endsWith('.map')) {
        res.setHeader('Content-Type', 'application/json');
      }
      // Enable CORS for assets
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    },
    // Add error handling for missing files
    onError: (err, req, res, next) => {
      logger.error('Error serving asset file:', {
        path: req.path,
        error: err.message,
      });
      next(err);
    },
  }));
  
  logger.info('✅ Assets directory serving enabled from:', assetsPath);
  
  // List some files in assets directory for debugging
  try {
    const files = readdirSync(assetsPath);
    const jsFiles = files.filter(f => f.endsWith('.js')).slice(0, 5);
    logger.info(`   Sample JS files in assets: ${jsFiles.join(', ') || 'none'}${files.length > 5 ? ` (${files.length} total files)` : ''}`);
  } catch (err) {
    logger.warn('   Could not list assets directory files:', err.message);
  }
} else {
  logger.warn('⚠️  Assets directory not found:', assetsPath);
  logger.warn('   Make sure to build the frontend: cd FRONTEND && npm run build');
}

// API Routes
// IMPORTANT: Order matters! More specific routes should come first
app.use('/api/v1', queryRoutes);
app.use('/api/v1', recommendationsRoutes);
app.use('/api/v1', knowledgeGraphRoutes);
app.use('/api/debug', diagnosticsRoutes);
app.use('/api/debug', contentRoutes);
// Support routes must come after /api/v1 and /api/debug to avoid conflicts
app.use('/api', microserviceSupportRoutes);
app.use('/auth', authRoutes);

// Error handling middleware chain
// 1. Method Not Allowed handler (405) - catches requests with wrong HTTP method
app.use(methodNotAllowedHandler);
// 2. Not Found handler (404) - catches requests to non-existent routes
app.use(notFoundHandler);
// 3. Error handler (500) - catches all other errors
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




