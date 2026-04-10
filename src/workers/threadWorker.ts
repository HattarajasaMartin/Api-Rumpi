import { Worker } from 'bullmq';
import prisma from '../config/prisma';
import { io } from '../index';

const worker = new Worker('thread-queue', async (job) => { // worker standby (data baru => langsung proses) 
    const { content, image, userId } = job.data; // ambil data di queue/antrian

    console.log(`Processing thread for user: ${userId} with image: ${image}`);

    // Simpan ke database utama
    const newThread = await prisma.thread.create({
        data: {
            content,
            image: image || null, // Nama file yang tersimpan di folder uploads/
            created_by: userId,
        },
        include: {
            user: {
                select: {
                    username: true,
                    full_name: true,
                    photo_profile: true
                }
            }
        }
    });

    // Kirim notifikasi Real-time
    io.emit('newThread', { // kirim ke semua user yang lagi online
        ...newThread,
        avatar: newThread.user?.photo_profile,
        username: newThread.user?.username,
        name: newThread.user?.full_name,
        likes: 0,
        replies: 0,
        isLiked: false
    });

}, {
    connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379
    }
});

export default worker;