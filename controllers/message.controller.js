const Message = require('../models/message.model');
const User = require('../models/user.model');
const TrainerTrainee = require('../models/trainerTrainee.model');
const Notification = require('../models/notification.model');

let io = null;

const setSocketServer = (socketServer) => {
  io = socketServer;
};

const createMessage = async ({ senderId, receiverId, content }) => {
  if (!receiverId || !content || !content.trim()) {
    throw { status: 400, message: 'receiverId and content are required' };
  }

  if (senderId === receiverId) {
    throw { status: 400, message: 'You cannot message yourself' };
  }

  const [sender, receiver] = await Promise.all([
    User.findById(senderId).select('firstName lastName'),
    User.findById(receiverId)
  ]);

  if (!receiver) {
    throw { status: 404, message: 'Receiver not found' };
  }

  const isLinked = await TrainerTrainee.findOne({
    isActive: true,
    $or: [
      { trainerId: senderId, traineeId: receiverId },
      { trainerId: receiverId, traineeId: senderId }
    ]
  });

  if (!isLinked) {
    throw { status: 403, message: 'You can only message users you are assigned to' };
  }

  const message = await Message.create({ senderId, receiverId, content: content.trim() });
  const populated = await message.populate([
    { path: 'senderId', select: 'firstName lastName role' },
    { path: 'receiverId', select: 'firstName lastName role' }
  ]);

  const senderName = sender
    ? `${sender.firstName} ${sender.lastName}`
    : 'Someone';

  await Notification.create({
    userId: receiverId,
    type: 'message',
    title: `💬 New message from ${senderName}`,
    body: content.trim().length > 80
      ? content.trim().slice(0, 80) + '…'
      : content.trim(),
    relatedId: message._id
  });

  return populated;
};

const createMessageFromSocket = async (senderId, payload) => {
  const populated = await createMessage({
    senderId,
    receiverId: payload.receiverId,
    content: payload.content
  });

  if (io) {
    io.to(payload.receiverId.toString()).emit('newMessage', populated);
    io.to(senderId.toString()).emit('messageSent', populated);
  }

  return populated;
};

// POST /api/messages
const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    const populated = await createMessage({ senderId, receiverId, content });

    if (io) {
      io.to(receiverId.toString()).emit('newMessage', populated);
    }

    res.status(201).json({ message: 'Message sent', data: populated });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/messages/:userId
const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId }
      ]
    })
      .populate('senderId', 'firstName lastName role')
      .populate('receiverId', 'firstName lastName role')
      .sort({ createdAt: 1 });

    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { sendMessage, getMessages, setSocketServer, createMessageFromSocket };
