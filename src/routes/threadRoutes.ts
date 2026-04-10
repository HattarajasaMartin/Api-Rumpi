import { Router } from 'express';
import { getThreads, createThread, toggleLike } from '../controllers/threadController';
import { authenticate } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware'; // Pastikan path ini sesuai

const router = Router();

// Endpoint untuk AMBIL data list thread
router.get('/', authenticate, getThreads);

// Endpoint untuk MEMBUAT postingan baru (Sekarang mendukung upload gambar)
router.post('/', authenticate, upload.single('image'), createThread);

// Endpoint untuk LIKE/UNLIKE
router.post('/like', authenticate, toggleLike);

export default router;