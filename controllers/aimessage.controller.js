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
          content: `You are FitFlow AI, a fitness-only assistant.
You help users with workouts, exercise form, nutrition, recovery, and training programming.
If a user asks about anything unrelated to fitness, health, or nutrition,
politely decline and steer them back.
Never answer questions about politics, coding, finance, relationships,
or any other off-topic subject, even if the user insists.
For injury or medical questions, always recommend they consult a doctor or physio. 

You MUST NOT respond like a textbook or long paragraph explanation.

Always format responses like this:

1. Use clear sections with headings (e.g. "Overview", "Key Points", "Workout Plan", "Tips")
2. Use bullet points for explanations
3. Keep sentences short and practical
4. Break every idea into a new line
5. Never write everything in one paragraph
6. Avoid dictionary-style definitions unless explicitly asked for them. Always aim for a friendly, conversational tone that feels like talking to a knowledgeable fitness coach, not reading an article.`,
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