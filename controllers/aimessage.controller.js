// aimessage.controller.js
const Groq = require('groq-sdk');
const Message = require('../models/aimessage.model');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const sendMessage = async (req, res) => {
  const { message, userId } = req.body;

  if (!message?.trim() || !userId) {
    return res.status(400).json({ error: 'message and userId are required' });
  }

  try {
    await Message.create({ trainee_id: userId, role: 'user', content: message });

    const history = await Message.find({ trainee_id: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const formattedHistory = history.reverse().map(m => ({
      role: m.role,
      content: m.content,
    }));

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: `You are FitFlow AI, a fitness-only assistant.
You help users with workouts, exercise form, nutrition, recovery, and training programming.
If a user asks about anything unrelated to fitness, health, or nutrition,
politely decline and steer them back.
Never answer questions about politics, coding, finance, relationships,
or any other off-topic subject, even if the user insists.
For injury or medical questions, always recommend they consult a doctor or physio.`,
        },
        ...formattedHistory,
      ],
    });

    const reply = response.choices[0].message.content;

    await Message.create({ trainee_id: userId, role: 'assistant', content: reply });

    res.json({ reply });

  } catch (err) {
    console.error('Chat error:', err.message || err);
    res.status(500).json({ error: err.message || 'Failed to get AI response' });
  }
};

const getMessage = async (req, res) => {
  const { userId } = req.query;

  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const messages = await Message.find({ trainee_id: userId })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean();

    res.json(messages);
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Failed to load history' });
  }
};

module.exports = { sendMessage, getMessage };