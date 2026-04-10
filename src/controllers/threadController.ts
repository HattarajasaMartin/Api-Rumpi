import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Queue } from 'bullmq';

// Instruksi utk membuat Antrean (Hubungkan ke Redis)
const threadQueue = new Queue('thread-queue', { // buat antrian baru menggunakan library bullmq
    connection: { // melakukan konfigurasi utk connect ke Redis
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379 // ambil PORT Redis (env itu string, diubah jadi number)
    }
});

// Interface untuk standarisasi data dari Prisma
interface ThreadFromPrisma {
    id: number;
    content: string;
    image: string | null;
    created_at: Date;
    user: {
        username: string;
        full_name: string | null;
        photo_profile: string | null;
    };
    _count: {
        likes: number;
        replies: number;
    };
    likes: { id: number }[];
}

/**
 * 1. GET ALL THREADS
 * Mengambil langsung dari Database untuk feed
 */
export const getThreads = async (req: AuthRequest, res: Response) => {
    try {
        const loggedInUserId = req.user?.userId;
        const limit = parseInt(req.query.limit as string) || 25;

        const threads = await prisma.thread.findMany({
            take: limit,
            orderBy: { created_at: 'desc' },
            include: {
                user: {
                    select: {
                        username: true,
                        full_name: true,
                        photo_profile: true,
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        replies: true,
                    },
                },
                likes: {
                    where: { user_id: loggedInUserId },
                    select: { id: true }
                }
            },
        }) as unknown as ThreadFromPrisma[];

        const result = threads.map((t) => ({
            id: t.id,
            content: t.content,
            image: t.image,
            avatar: t.user.photo_profile,
            username: t.user.username,
            name: t.user.full_name,
            likes: t._count.likes,
            replies: t._count.replies,
            isLiked: t.likes.length > 0,
        }));

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("ERROR_GET_THREADS:", error);
        return res.status(500).json({ error: "Gagal memuat threads" });
    }
};

/**
 * 2. CREATE THREAD (Update: Multer + Message Queue)
 * Menangkap file dari req.file dan memasukkan nama filenya ke antrean
 */
export const createThread = async (req: AuthRequest, res: Response) => {  // fungsi ini tidak langsung menyimpan ke database
    try {
        const { content } = req.body;
        const userId = req.user?.userId;

        // req.file berasal dari middleware upload.single('image')
        const file = req.file;

        // Validasi: Postingan tidak boleh kosong (teks)
        if (!content || content.trim() === "") {
            return res.status(400).json({ error: "Konten tidak boleh kosong" });
        }

        // Masukkan data ke antrean (Message Queue)
        // Kita simpan nama filenya saja (image: file.filename) ke Redis
        await threadQueue.add('new-thread-job', {  // tambahkan job ke Redis queue
            content,
            image: file ? file.filename : null,
            userId: userId as number,
        }, {
            attempts: 3,
            backoff: 5000
        });

        // Respon 202 Accepted: Diterima untuk diproses
        return res.status(202).json({
            message: "Postingan sedang diproses dan akan segera muncul!"
        });

    } catch (error: any) {
        console.error("ERROR_QUEUE_THREAD:", error);
        return res.status(500).json({ error: "Gagal memproses antrean postingan" });
    }
};

/**
 * 3. TOGGLE LIKE
 */
export const toggleLike = async (req: AuthRequest, res: Response) => {
    try {
        const { threadId } = req.body;
        const userId = req.user?.userId;

        if (!threadId) return res.status(400).json({ error: "Thread ID diperlukan" });

        const existingLike = await prisma.like.findFirst({
            where: {
                user_id: userId as number,
                thread_id: Number(threadId),
            },
        });

        if (existingLike) {
            await prisma.like.delete({ where: { id: existingLike.id } });
            return res.status(200).json({ message: "Unlike sukses", isLiked: false });
        } else {
            await prisma.like.create({
                data: {
                    user_id: userId as number,
                    thread_id: Number(threadId),
                    created_by: userId as number,
                },
            });
            return res.status(201).json({ message: "Like sukses", isLiked: true });
        }
    } catch (error: any) {
        return res.status(500).json({ error: "Gagal memproses like" });
    }
};