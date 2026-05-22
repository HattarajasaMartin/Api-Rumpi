import { Router } from 'express';
import { getReplies, createReply } from '../controllers/replyController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authenticate, getReplies);
router.post('/', authenticate, createReply);

export default router;