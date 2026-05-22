import { Worker } from 'bullmq';
import prisma from '../config/prisma';
import { io } from '../index'; // Pastikan export io ada di file index.ts utama

const replyWorker = new Worker(
    'reply-queue', // Nama queue harus SAMA dengan yang ada di Controller
    async (job) => {
        const { content, thread_id, userId } = job.data;

        console.log(`[Worker] Memproses reply untuk thread ${thread_id} dari user ${userId}`);

        try {
            // 1. Simpan ke database
            const newReply = await prisma.reply.create({
                data: {
                    content,
                    thread_id: thread_id,
                    user_id: userId,
                    created_by: userId,
                },
                include: {
                    user: {
                        select: {
                            username: true,
                            full_name: true,
                            photo_profile: true,
                        },
                    },
                },
            });

            // 2. Kirim notifikasi Real-time via Socket.io
            // Kita pakai ID thread agar hanya user yang sedang melihat thread tersebut yang menerima update
            io.emit(`newReply-${thread_id}`, {
                id: newReply.id,
                content: newReply.content,
                username: newReply.user.username,
                name: newReply.user.full_name,
                avatar: newReply.user.photo_profile,
                created_at: newReply.created_at,
            });

            console.log(`[Worker] Reply ID ${newReply.id} sukses diproses dan di-emit.`);
        } catch (error) {
            console.error(`[Worker] Gagal memproses reply:`, error);
            throw error; // Lempar error agar BullMQ bisa mencoba ulang (retry) jika dikonfigurasi
        }
    },
    {
        connection: {
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: Number(process.env.REDIS_PORT) || 6379,
        },
    }
);

export default replyWorker;