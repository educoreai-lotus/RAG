/**
 * Microservice Support Routes
 * Proxy routes for Assessment and DevLab microservices
 */

import express from 'express';
import { assessmentSupport, devlabSupport } from '../controllers/microserviceSupport.controller.js';

const router = express.Router();

/**
 * POST /api/assessment/support
 * Proxy endpoint for Assessment microservice
 */
router.post('/assessment/support', assessmentSupport);

/**
 * POST /api/devlab/support
 * Proxy endpoint for DevLab microservice
 */
router.post('/devlab/support', devlabSupport);

export default router;

