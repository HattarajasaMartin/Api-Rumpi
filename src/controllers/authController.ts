import { Request, Response } from 'express';
import prisma from '../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// -----------------------------------------------------------
// 1. REGISTER (UNTUK USER BARU VIA FORM)
// -----------------------------------------------------------
export const register = async (req: Request, res: Response) => {
    try {
        const { username, email, password, full_name } = req.body;

        // Hash password sebelum disimpan
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
    } catch (error: any) {
        // Cek jika email atau username sudah terdaftar
        res.status(400).json({ error: "Username or Email already exists" });
    }
};

// -----------------------------------------------------------
// 2. LOGIN MANUAL (CEK EMAIL & PASSWORD)
// -----------------------------------------------------------
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        // Validasi: User harus ada, punya password, dan hash-nya cocok
        if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid Credentials" });
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                photo_profile: user.photo_profile
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// -----------------------------------------------------------
// 3. GOOGLE LOGIN (VERIFIKASI TOKEN GOOGLE)
// -----------------------------------------------------------
export const googleLogin = async (req: Request, res: Response) => {
    try {
        const { token } = req.body; // tangkap/terima token dari FE

        const ticket = await client.verifyIdToken({  // Hubungi Google utk konfirmasi apakah benar dikasih oleh google tokennya?
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload(); // Kalau tokennya benar/asli
        if (!payload) return res.status(400).json({ error: "Invalid Google Token" });

        const { email, name, picture } = payload; // Ambil data dari google yaitu emailnya, nama google sama foto profil akun google

        // Cari user, jika tidak ada maka buat baru (Upsert)
        let user = await prisma.user.findUnique({ where: { email: email as string } });

        if (!user) {
            const baseUsername = email?.split('@')[0].toLowerCase();
            user = await prisma.user.create({
                data: {
                    email: email as string,
                    full_name: name,
                    username: `${baseUsername}${Math.floor(Math.random() * 1000)}`,
                    photo_profile: picture,
                    // password otomatis NULL (sesuai schema password String?)
                }
            });
        }

        const talkaToken = jwt.sign( // Setelah berhasil daftar akun pakai google, maka dari BE buatin sendiri tokennya
            { userId: user.id },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );

        res.json({ // Kirim respon ke FE
            token: talkaToken,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                photo_profile: user.photo_profile
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: "Google Authentication Failed" });
    }
};