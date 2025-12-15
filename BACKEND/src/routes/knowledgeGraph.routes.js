/**
 * Knowledge Graph Routes
 */

import express from 'express';
import { getSkillProgress } from '../controllers/knowledgeGraph.controller.js';

const router = express.Router();

// GET /api/v1/knowledge/progress/user/:userId/skill/:skillId?tenant_id=dev.educore.local
router.get('/knowledge/progress/user/:userId/skill/:skillId', getSkillProgress);

export default router;

















