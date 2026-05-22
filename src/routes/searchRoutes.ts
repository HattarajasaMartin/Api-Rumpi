import { Router } from 'express';
import { searchUsers } from '../controllers/searchController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// GET /api/v1/search?keyword=...
router.get('/', authenticate, searchUsers);

export default router;