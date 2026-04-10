import { Router } from 'express';
// 1. Tambahkan googleLogin di import
import { register, login, googleLogin } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// 2. Tambahkan route baru untuk Google Login
router.post('/google-login', googleLogin);

export default router;