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

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
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
app.use('/api', microserviceSupportRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});




