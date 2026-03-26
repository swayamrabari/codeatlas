import { Router } from 'express';
import authRoutes from './auth.route.js';
import uploadRoutes from './upload.route.js';
import projectCoreRoutes from './project-core.route.js';
import overviewRoutes from './overview.route.js';
import insightsRoutes from './insights.route.js';
import filesRoutes from './files.route.js';
import sourceRoutes from './source.route.js';
import askRoutes from './ask.route.js';

const router = Router();

router.use(authRoutes);
router.use(uploadRoutes);
router.use(projectCoreRoutes);
router.use(overviewRoutes);
router.use(insightsRoutes);
router.use(filesRoutes);
router.use(sourceRoutes);
router.use(askRoutes);

export default router;
