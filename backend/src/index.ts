import 'dotenv/config';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './lib/prisma';

const httpServer = createServer(app);

export const io = new SocketServer(httpServer, {
  cors: {
    origin: [config.frontendUrl, 'http://localhost:5173'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string;
  if (userId) socket.join(`user:${userId}`);

  socket.on('join:demand', (demandId: string) => socket.join(`demand:${demandId}`));
  socket.on('leave:demand', (demandId: string) => socket.leave(`demand:${demandId}`));
  socket.on('disconnect', () => logger.debug(`Socket disconnected: ${socket.id}`));
});

const PORT = config.port;

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.env} mode`);
});

const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  httpServer.close(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default httpServer;
