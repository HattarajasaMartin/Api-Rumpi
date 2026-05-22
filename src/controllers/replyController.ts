import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Queue } from 'bullmq';

// Inisialisasi Antrean (Queue) untuk Reply
const replyQueue = new Queue('reply-queue', {
    connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379
    }
});

// GET ALL REPLIES (Tetap langsung ke DB karena ini operasi Read)
export const getReplies = async (req: AuthRequest, res: Response) => {
    try {
        const { thread_id } = req.query;

        if (!thread_id) return res.status(400).json({ error: "thread_id dibutuhkan" });

        const replies = await prisma.reply.findMany({
            where: { thread_id: Number(thread_id) },
            include: {
                user: {
                    select: { username: true, full_name: true, photo_profile: true }
                }
            },
            orderBy: { created_at: 'asc' }
        });

        const result = replies.map((r) => ({
            id: r.id,
            content: r.content,
            image: r.image,
            username: r.user.username,
            name: r.user.full_name,
            avatar: r.user.photo_profile,
            created_at: r.created_at
        }));

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ error: "Gagal memuat balasan" });
    }
};

// CREATE REPLY (Sekarang menggunakan Queue & Worker)
export const createReply = async (req: AuthRequest, res: Response) => {
    try {
        const { content, thread_id } = req.body;
        const userId = req.user?.userId;

        if (!content || !thread_id) {
            return res.status(400).json({ error: "Konten dan thread_id wajib diisi" });
        }

        // Kirim data ke Antrean (Redis)
        // Data ini akan ditangkap oleh replyWorker.ts
        await replyQueue.add('new-reply-job', {
            content,
            thread_id: Number(thread_id),
            userId: userId as number,
        });

        // Berikan respon cepat ke Frontend (Status 202 = Accepted)
        return res.status(202).json({
            message: "Balasan sedang diproses dalam antrean",
            status: "processing"
        });
    } catch (error) {
        console.error("Queue Error:", error);
        return res.status(500).json({ error: "Gagal memproses antrean balasan" });
    }
};