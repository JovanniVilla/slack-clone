"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const PORT = parseInt(process.env.SOCKET_PORT || '4000', 10);
const INTERNAL_SECRET = process.env.INTERNAL_SOCKET_SECRET || 'slack-clone-internal-socket-secret';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const server = http_1.default.createServer((req, res) => {
    // Health check
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            connections: io.engine.clientsCount,
            uptime: process.uptime(),
        }));
        return;
    }
    // Internal emit endpoint for Next.js API
    if (req.method === 'POST' && req.url === '/emit') {
        const authHeader = req.headers['x-internal-key'];
        if (authHeader !== INTERNAL_SECRET) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized internal call' }));
            return;
        }
        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
        });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const { room, rooms, event, data } = payload;
                if (!event) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Event name is required' }));
                    return;
                }
                if (Array.isArray(rooms)) {
                    rooms.forEach((r) => io.to(r).emit(event, data));
                }
                else if (room) {
                    io.to(room).emit(event, data);
                }
                else {
                    io.emit(event, data);
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            }
            catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON body' }));
            }
        });
        return;
    }
    res.writeHead(404);
    res.end('Not Found');
});
const io = new socket_io_1.Server(server, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
});
io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);
    socket.on('join-room', (room) => {
        if (typeof room === 'string' && room.trim()) {
            socket.join(room);
            console.log(`[Socket] ${socket.id} joined room: ${room}`);
        }
    });
    socket.on('leave-room', (room) => {
        if (typeof room === 'string' && room.trim()) {
            socket.leave(room);
            console.log(`[Socket] ${socket.id} left room: ${room}`);
        }
    });
    socket.on('disconnect', (reason) => {
        console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);
    });
});
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [Socket Microservice] Realtime server running on port ${PORT}`);
});
