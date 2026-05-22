import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

// GET ALL REPLIES
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

// CREATE REPLY - langsung ke DB + socket realtime
export const createReply = async (req: AuthRequest, res: Response) => {
    try {
        const { content, thread_id } = req.body;
        const userId = req.user?.userId;

        if (!content || !thread_id) {
            return res.status(400).json({ error: "Konten dan thread_id wajib diisi" });
        }

        const reply = await prisma.reply.create({
            data: {
                content,
                thread_id: Number(thread_id),
                user_id: userId as number,
            },
            include: {
                user: {
                    select: { username: true, full_name: true, photo_profile: true }
                }
            }
        });

        const result = {
            id: reply.id,
            content: reply.content,
            image: reply.image,
            username: reply.user.username,
            name: reply.user.full_name,
            avatar: reply.user.photo_profile,
            created_at: reply.created_at,
        };

        // Emit socket realtime
        const io = req.app.get('io');
        io.emit(`newReply-${thread_id}`, result);

        return res.status(201).json(result);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Gagal membuat balasan" });
    }
};