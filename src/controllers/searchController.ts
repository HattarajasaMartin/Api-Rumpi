import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export const searchUsers = async (req: AuthRequest, res: Response) => {
    try {
        const keyword = req.query.keyword as string;

        if (!keyword || keyword.trim() === "") {
            return res.status(400).json({
                status: 'error',
                message: 'Keyword tidak boleh kosong.'
            });
        }

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: keyword, mode: 'insensitive' } },
                    { full_name: { contains: keyword, mode: 'insensitive' } },
                ]
            },
            select: {
                id: true,
                username: true,
                full_name: true,
                photo_profile: true,
                _count: {
                    select: { followers: true }
                }
            },
            take: 20,
        });

        const data = users.map(u => ({
            id: u.id,
            username: u.username,
            name: u.full_name,
            avatar: u.photo_profile,
            followers: u._count.followers,
        }));

        return res.json({
            status: 'success',
            data: { users: data }
        });

    } catch (error: any) {
        return res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user data. Please try again later.'
        });
    }
};