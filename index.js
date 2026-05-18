const dotenv = require('dotenv');
dotenv.config(); // ← must be FIRST before anything reads env vars

const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');

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
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://fitflow-o4hx.onrender.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
// app.use('/api/chat', aimessageRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('Connected to MongoDB');
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});