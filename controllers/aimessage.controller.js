// aimessage.controller.js
const OpenAI = require("openai");
const Message = require('../models/aimessage.model');
const User = require('../models/user.model');
const Session = require('../models/session.model');

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

const summarizeProgress = (sessions) => {
  if (!sessions || sessions.length === 0) return 'No sessions logged yet.';

  const totalSessions = sessions.length;
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const avgDuration = Math.round(totalDuration / totalSessions);
  const exercisesLogged = sessions.reduce((sum, s) => sum + (s.exercisesDone?.length || 0), 0);

  return `Sessions: ${totalSessions}, Total duration: ${totalDuration}min, Average duration: ${avgDuration}min, Exercises logged: ${exercisesLogged}`;
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

    // Gather user profile and recent sessions to provide context
    const user = await User.findById(userId).select('firstName lastName role createdAt bio');
    const sessions = await Session.find({ traineeId: userId }).sort({ date: -1 }).limit(10).lean();
    const progressSummary = summarizeProgress(sessions);

    const userContext = `User: ${user ? `${user.firstName} ${user.lastName} (${user.role})` : 'Unknown'}\nBio: ${user?.bio || 'N/A'}\nProgress summary: ${progressSummary}`;

    const systemPrompt = `
You are FitFlow AI, a professional fitness coach. Use the provided user context to personalize responses.

RULES:
- Always prioritize safety and avoid medical advice; recommend consulting a professional when needed.
- Tailor coaching to the user's recent progress and logged sessions.
- Suggest achievable next steps and celebrate improvements.
- If the user hasn't logged sessions, encourage gentle onboarding and simple starting actions.

RESPONSE FORMAT (STRICT):
Overview:
- 1–2 short lines

Key Points:
- Bullet point 1
- Bullet point 2

Action Plan (if applicable):
- Step 1
- Step 2

Tips:
- Tip 1

User Context (do not reveal internal IDs):
${userContext}
`;

    const response = await getClient().chat.completions.create({
      model: "meta/llama-3.1-70b-instruct",
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedHistory,
        { role: 'user', content: message },
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