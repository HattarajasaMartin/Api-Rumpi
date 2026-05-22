import { Request, Response } from 'express';
import prisma from '../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { AuthRequest } from '../middlewares/authMiddleware';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ================= REGISTER =================
export const register = async (req: Request, res: Response) => {
    try {
        const { username, email, password, full_name } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                email,
                full_name,
                password: hashedPassword
            }
        });

        res.status(201).json({ message: "User Created", id: user.id });

    } catch {
        res.status(400).json({ error: "Username or Email already exists" });
    }
};

// ================= LOGIN =================
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                username: true,
                full_name: true,
                photo_profile: true,
                password: true,
                bio: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                    }
                }
            }
        });

        if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid Credentials" });
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );

        return res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                photo_profile: user.photo_profile,

                // 🔥 FIX UTAMA (SWAP)
                followers: user._count.following,
                following: user._count.followers,

                bio: user.bio
            }
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// ================= GOOGLE LOGIN =================
export const googleLogin = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) return res.status(400).json({ error: "Invalid Google Token" });

        const { email, name, picture } = payload;

        let user = await prisma.user.findUnique({
            where: { email: email as string },
            select: {
                id: true,
                username: true,
                full_name: true,
                photo_profile: true,
                bio: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                    }
                }
            }
        });

        // kalau belum ada → buat
        if (!user) {
            const baseUsername = email?.split('@')[0].toLowerCase();

            user = await prisma.user.create({
                data: {
                    email: email as string,
                    full_name: name,
                    username: `${baseUsername}${Math.floor(Math.random() * 1000)}`,
                    photo_profile: picture,
                },
                select: {
                    id: true,
                    username: true,
                    full_name: true,
                    photo_profile: true,
                    bio: true,
                    _count: {
                        select: {
                            followers: true,
                            following: true,
                        }
                    }
                }
            });
        }

        const talkaToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );

        return res.json({
            token: talkaToken,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                photo_profile: user.photo_profile,

                // 🔥 FIX UTAMA (SWAP)
                followers: user._count.following,
                following: user._count.followers,

                bio: user.bio
            }
        });

    } catch {
        res.status(500).json({ error: "Google Authentication Failed" });
    }
};

// ================= EDIT PROFILE =================
export const editProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;

        const { full_name, bio, username } = req.body;
        const photo_profile = req.file ? req.file.filename : undefined;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                full_name,
                bio,
                username,
                ...(photo_profile && { photo_profile }),
            },
            select: {
                id: true,
                username: true,
                full_name: true,
                photo_profile: true,
                bio: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                    }
                }
            }
        });

        return res.json({
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                full_name: updatedUser.full_name,
                photo_profile: updatedUser.photo_profile,

                // 🔥 FIX UTAMA (SWAP)
                followers: updatedUser._count.following,
                following: updatedUser._count.followers,

                bio: updatedUser.bio,
            }
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};