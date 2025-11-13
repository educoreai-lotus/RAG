/**
 * Application entry point
 */

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware.js';
import { logger } from './utils/logger.util.js';
import queryRoutes from './routes/query.routes.js';
import microserviceSupportRoutes from './routes/microserviceSupport.routes.js';
import recommendationsRoutes from './routes/recommendations.routes.js';

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'rag-microservice' });
});

// API Routes
app.use('/api/v1', queryRoutes);
app.use('/api/v1', recommendationsRoutes);
app.use('/api', microserviceSupportRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Query endpoint: http://localhost:${PORT}/api/v1/query`);
  logger.info(`Assessment support: http://localhost:${PORT}/api/assessment/support`);
  logger.info(`DevLab support: http://localhost:${PORT}/api/devlab/support`);
  logger.info(`Recommendations: http://localhost:${PORT}/api/v1/personalized/recommendations/:userId`);
  logger.info(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
});




