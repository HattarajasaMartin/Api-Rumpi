import { Router } from 'express';
import { getThreads, createThread, toggleLike, getThreadById } from '../controllers/threadController';
import { authenticate } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = Router();

router.get('/', authenticate, getThreads);
router.get('/:id', authenticate, getThreadById);
router.post('/', authenticate, upload.single('image'), createThread);
router.post('/like', authenticate, toggleLike);

export default router;