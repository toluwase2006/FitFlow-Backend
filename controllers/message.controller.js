const Message = require('../models/message.model');
const User = require('../models/user.model');
const TrainerTrainee = require('../models/trainerTrainee.model');

// POST /api/messages
const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    if (!receiverId || !content || !content.trim()) {
      return res.status(400).json({ message: 'receiverId and content are required' });
    }

    const senderId = req.user.id;

    if (senderId === receiverId) {
      return res.status(400).json({ message: 'You cannot message yourself' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Messaging is only allowed between an actively assigned trainer and trainee
    const isLinked = await TrainerTrainee.findOne({
      isActive: true,
      $or: [
        { trainerId: senderId, traineeId: receiverId },
        { trainerId: receiverId, traineeId: senderId }
      ]
    });

    if (!isLinked) {
      return res.status(403).json({ message: 'You can only message users you are assigned to' });
    }

    const message = await Message.create({ senderId, receiverId, content: content.trim() });
    const populated = await message.populate([
      { path: 'senderId', select: 'firstName lastName role' },
      { path: 'receiverId', select: 'firstName lastName role' }
    ]);

    res.status(201).json({ message: 'Message sent', data: populated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/messages/:userId
const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId } = req.params;

    // Return the full thread between the two users (both directions)
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

module.exports = { sendMessage, getMessages };
