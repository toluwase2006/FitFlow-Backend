// aimessage.controller.js
const OpenAI = require("openai");
const Message = require('../models/aimessage.model');

let client;

const getClient = () => {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });
  }
  return client;
};

const sendMessage = async (req, res) => {
  const { message, userId } = req.body;

  if (!message?.trim() || !userId) {
    return res.status(400).json({ error: "message and userId required" });
  }

  try {
    await Message.create({ trainee_id: userId, role: "user", content: message });

    const history = await Message.find({ trainee_id: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const formattedHistory = history.reverse().map(m => ({
      role: m.role,
      content: m.content,
    }));

    const response = await getClient().chat.completions.create({
      model: "meta/llama-3.1-70b-instruct",
      messages: [
        {
          role: "system",
          content: `
You are FitFlow AI, a professional fitness coach.

## RULES
- Only answer fitness, nutrition, exercise, recovery, and health-related questions.
- If the question is not related, politely refuse and redirect to fitness topics.
- For medical issues, advise consulting a doctor.

## RESPONSE FORMAT (STRICT - MUST FOLLOW)
You MUST structure every response like this:

Overview:
- 1–2 short lines

Key Points:
- Bullet point 1
- Bullet point 2
- Bullet point 3

Workout / Advice (if applicable):
- Step 1
- Step 2
- Step 3

Tips:
- Tip 1
- Tip 2

## STYLE RULES
- Never write long paragraphs
- Every idea must be on a new line
- Use simple, direct language
- Be conversational like a personal coach
`,
        },
        ...formattedHistory,
        { role: "user", content: message },
      ],
      max_tokens: 1024,
    });

    const reply = response.choices[0].message.content;

    await Message.create({
      trainee_id: userId,
      role: "assistant",
      content: reply,
    });

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
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