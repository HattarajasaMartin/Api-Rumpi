import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Queue } from 'bullmq';

const threadQueue = new Queue('thread-queue', {
    connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379
    }
});

// GET ALL THREADS
export const getThreads = async (req: AuthRequest, res: Response) => {
    try {
        const loggedInUserId = req.user?.userId;
        const limit = parseInt(req.query.limit as string) || 25;

        const threads = await prisma.thread.findMany({
            take: limit,
            orderBy: { created_at: 'desc' },
            include: {
                user: {
                    select: { username: true, full_name: true, photo_profile: true }
                },
                _count: {
                    select: { likes: true, replies: true }
                },
                likes: {
                    where: { user_id: loggedInUserId },
                    select: { id: true }
                }
            },
        });

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
    } catch (error) {
        return res.status(500).json({ error: "Gagal memuat threads" });
    }
};

// GET THREAD DETAIL BY ID (Disesuaikan dengan Schema created_by)
export const getThreadById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const loggedInUserId = req.user?.userId;

        const thread = await prisma.thread.findUnique({
            where: { id: Number(id) },
            include: {
                user: {
                    select: { username: true, full_name: true, photo_profile: true }
                },
                _count: {
                    select: { likes: true, replies: true }
                },
                likes: {
                    where: { user_id: loggedInUserId },
                    select: { id: true }
                }
            },
        });

        if (!thread) return res.status(404).json({ error: "Postingan tidak ditemukan" });

        return res.status(200).json({
            id: thread.id,
            content: thread.content,
            image: thread.image,
            avatar: thread.user.photo_profile,
            username: thread.user.username,
            name: thread.user.full_name,
            likes: thread._count.likes,
            replies: thread._count.replies,
            isLiked: thread.likes.length > 0,
        });
    } catch (error) {
        return res.status(500).json({ error: "Gagal memuat detail" });
    }
};

// GET THREADS BY USER ID UNTUK DI PROFILE
export const getThreadsByUser = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const loggedInUserId = req.user?.userId;

        const threads = await prisma.thread.findMany({
            where: { created_by: Number(userId) },
            orderBy: { created_at: 'desc' },
            include: {
                user: {
                    select: { username: true, full_name: true, photo_profile: true }
                },
                _count: {
                    select: { likes: true, replies: true }
                },
                likes: {
                    where: { user_id: loggedInUserId },
                    select: { id: true }
                }
            }
        });

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
    } catch (error) {
        return res.status(500).json({ error: "Gagal memuat threads user" });
    }
};

// CREATE THREAD (Queue)
export const createThread = async (req: AuthRequest, res: Response) => {
    try {
        //  AMBIL DATA DARI REQUEST
        const { content } = req.body;
        const userId = req.user?.userId;
        const file = req.file;

        if (!content) return res.status(400).json({ error: "Konten kosong" }); // validasi kalau konten kosong

        await threadQueue.add('new-thread-job', { // membuat worker standby
            content,
            image: file ? file.filename : null,
            userId: userId as number, // Ini akan diproses worker menggunakan created_by
        });

        return res.status(202).json({ message: "Postingan sedang diproses!" });
    } catch (error) {
        return res.status(500).json({ error: "Gagal" });
    }
};

// TOGGLE LIKE
export const toggleLike = async (req: AuthRequest, res: Response) => {
    try {
        const { threadId } = req.body;
        const userId = req.user?.userId;

        const existingLike = await prisma.like.findFirst({
            where: { user_id: userId, thread_id: Number(threadId) }
        });

        if (existingLike) {
            await prisma.like.delete({ where: { id: existingLike.id } });
            return res.status(200).json({ isLiked: false });
        } else {
            await prisma.like.create({
                data: {
                    user_id: userId as number,
                    thread_id: Number(threadId),
                    created_by: userId
                }
            });
            return res.status(201).json({ isLiked: true });
        }
    } catch (error) {
        return res.status(500).json({ error: "Gagal" });
    }
};