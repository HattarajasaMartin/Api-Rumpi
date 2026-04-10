import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getReplies = async (req: AuthRequest, res: Response) => {
    try {
        const { thread_id } = req.query;
        if (!thread_id) return res.status(400).json({ error: "thread_id dibutuhkan" });

        const replies = await prisma.reply.findMany({
            where: { thread_id: Number(thread_id) },
            include: {
                user: { select: { username: true, full_name: true, photo_profile: true } }
            },
            orderBy: { created_at: 'asc' }
        });

        const result = replies.map((r: any) => ({
            id: r.id,
            content: r.content,
            username: r.user.username,
            name: r.user.full_name,
            avatar: r.user.photo_profile,
        }));
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ error: "Gagal memuat balasan" });
    }
};