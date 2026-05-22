import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getFollows = async (req: AuthRequest, res: Response) => {
    try {
        const loggedInUserId = req.user?.userId;
        const type = req.query.type as string;
        const targetUserId = req.query.userId
            ? Number(req.query.userId)
            : loggedInUserId;

        if (!loggedInUserId) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }

        if (!targetUserId) {
            return res.status(400).json({ status: 'error', message: 'userId tidak valid' });
        }

        // 🔥 ambil daftar following user login (untuk cek is_following)
        const myFollowing = await prisma.following.findMany({
            where: { follower_id: loggedInUserId },
            select: { following_id: true }
        });

        const myFollowingIds = myFollowing.map(f => f.following_id);

        // ===================== FOLLOWERS =====================
        if (type === 'followers') {
            const followers = await prisma.following.findMany({
                where: {
                    following_id: targetUserId
                },
                include: {
                    follower: {
                        select: {
                            id: true,
                            username: true,
                            full_name: true,
                            photo_profile: true,
                        }
                    }
                }
            });

            const data = followers.map(f => ({
                id: f.follower.id,
                username: f.follower.username,
                name: f.follower.full_name,
                avatar: f.follower.photo_profile,
                is_following: myFollowingIds.includes(f.follower.id),
            }));

            return res.json({
                status: 'success',
                data: { followers: data }
            });
        }

        // ===================== FOLLOWING =====================
        else if (type === 'following') {
            const following = await prisma.following.findMany({
                where: {
                    follower_id: targetUserId
                },
                include: {
                    following: {
                        select: {
                            id: true,
                            username: true,
                            full_name: true,
                            photo_profile: true,
                        }
                    }
                }
            });

            const data = following.map(f => ({
                id: f.following.id,
                username: f.following.username,
                name: f.following.full_name,
                avatar: f.following.photo_profile,
                is_following: myFollowingIds.includes(f.following.id),
            }));

            return res.json({
                status: 'success',
                data: { following: data }
            });
        }

        else {
            return res.status(400).json({
                status: 'error',
                message: 'Query param type harus "followers" atau "following"'
            });
        }

    } catch (error: any) {
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};


// ===================== FOLLOW =====================
export const followUser = async (req: AuthRequest, res: Response) => {
    try {
        const followerId = req.user?.userId;
        const { followed_user_id } = req.body;

        if (!followerId) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }

        if (!followed_user_id) {
            return res.status(400).json({ status: 'error', message: 'followed_user_id is required' });
        }

        if (followerId === followed_user_id) {
            return res.status(400).json({ status: 'error', message: 'Tidak bisa follow diri sendiri.' });
        }

        const existing = await prisma.following.findFirst({
            where: {
                follower_id: followerId,
                following_id: followed_user_id
            }
        });

        if (existing) {
            return res.status(400).json({ status: 'error', message: 'Kamu sudah follow user ini.' });
        }

        await prisma.following.create({
            data: {
                follower_id: followerId,
                following_id: followed_user_id
            }
        });

        return res.json({
            status: 'success',
            message: 'You have successfully followed the user.',
            data: {
                user_id: followed_user_id,
                is_following: true
            }
        });

    } catch (error: any) {
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};


// ===================== UNFOLLOW =====================
export const unfollowUser = async (req: AuthRequest, res: Response) => {
    try {
        const followerId = req.user?.userId;
        const { followed_id } = req.body;

        if (!followerId) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }

        if (!followed_id) {
            return res.status(400).json({ status: 'error', message: 'followed_id is required' });
        }

        await prisma.following.deleteMany({
            where: {
                follower_id: followerId,
                following_id: followed_id
            }
        });

        return res.json({
            status: 'success',
            message: 'You have successfully unfollowed the user.',
            data: {
                user_id: followed_id,
                is_following: false
            }
        });

    } catch (error: any) {
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};