import { Router } from 'express';
import { getUserByUsername, getSuggestedUsers } from '../controllers/userController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.get('/suggested', authenticate, getSuggestedUsers); // ← HARUS sebelum /:username
router.get('/:username', authenticate, getUserByUsername);

export default router;