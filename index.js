const dotenv = require('dotenv');
dotenv.config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth.route');
const userRoutes = require('./routes/user.route');
const trainerRoutes = require('./routes/trainer.route');
const workoutRoutes = require('./routes/workout.route');
const sessionRoutes = require('./routes/session.route');
const adminRoutes = require('./routes/admin.route');
const progressRoutes = require('./routes/progress.route');
const messageRoutes = require('./routes/message.route');
const aimessageRoutes = require('./routes/aimessage.route');
const productRoutes = require('./routes/product.route');
const cartRoutes = require('./routes/cart.route');
const notificationRoutes = require('./routes/notification.route');
const messageController = require('./controllers/message.controller');

const app = express();

const clientOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:5174",
  "https://fitflow-o4hx.onrender.com"
];

app.use(cors({
  origin: clientOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trainers', trainerRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chat', aimessageRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/notifications', notificationRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: clientOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  },
});

const onlineUsers = new Map();

const addOnlineUser = (userId, socketId) => {
  const sockets = onlineUsers.get(userId) || new Set();
  sockets.add(socketId);
  onlineUsers.set(userId, sockets);
};

const removeOnlineUser = (userId, socketId) => {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
  }
};

const verifySocketToken = (token) => {
  if (!token) throw new Error('Authentication token required');
  return jwt.verify(token, process.env.JWT_SECRET);
};

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = verifySocketToken(token);
    const userId = (decoded.id ?? decoded._id)?.toString();

    if (!userId) {
      return next(new Error('Invalid token payload'));
    }

    socket.data.userId = userId;
    next();
  } catch (error) {
    next(new Error('Socket authentication failed'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  socket.join(userId);
  addOnlineUser(userId, socket.id);

  socket.emit('socket-connected', { userId });

  socket.on('sendMessage', async (payload, callback) => {
    try {
      const message = await messageController.createMessageFromSocket(userId, payload);
      callback?.({ status: 'ok', data: message });
    } catch (error) {
      callback?.({ status: 'error', code: error.status || 500, message: error.message || 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    removeOnlineUser(userId, socket.id);
  });
});

messageController.setSocketServer(io);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('Connected to MongoDB');
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});