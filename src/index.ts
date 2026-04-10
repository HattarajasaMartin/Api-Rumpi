import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path'; // Tambahkan ini
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/authRoutes';
import threadRoutes from './routes/threadRoutes';
import './workers/threadWorker';

dotenv.config();
const app = express();
const httpServer = createServer(app);

// Inisialisasi Socket.io
export const io = new Server(httpServer, {
    cors: { origin: "http://localhost:5173" }
});

app.use(cors());
app.use(express.json());

// --- UPDATE: EXPOSE FOLDER UPLOADS ---
// Membuat folder uploads bisa diakses via URL browser
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Simpan instance io agar bisa diakses di tempat lain
app.set('io', io);

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/thread', threadRoutes);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Backend running on port ${PORT}`));