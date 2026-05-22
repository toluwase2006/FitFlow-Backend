const { GoogleGenerativeAI } = require('@google/generative-ai');
const Message = require('../models/aimessage.model');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are FitFlow AI, a fitness-only assistant.
You help users with workouts, exercise form, nutrition, recovery, and training programming.
If a user asks about anything unrelated to fitness, health, or nutrition,
politely decline and steer them back.
Never answer questions about politics, coding, finance, relationships,
or any other off-topic subject, even if the user insists.
For injury or medical questions, always recommend they consult a doctor or physio.`;


// Send Message
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
      role: m.role === 'assistant' ? 'model' : 'user', // Gemini uses 'model' instead of 'assistant'
      parts: [{ text: m.content }],
    }));

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const chat = model.startChat({
      history: formattedHistory.slice(0, -1), // all but the last message (current user message)
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    await Message.create({ trainee_id: userId, role: 'assistant', content: reply });

    res.json({ reply });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
};


// Get Messages
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