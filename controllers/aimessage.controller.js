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

    // detect if user asked for pidgin or provided language
    const wantsPidgin = /\bpidgin\b|\bspeak pidgin\b|\bpidgin english\b/i.test(message) || req.body.language === 'pidgin';
    const isGreeting = /^\s*(hi|hello|hey|hey there|good morning|good afternoon|good evening)\b[!.,\s]?/i.test(message);

    const languageInstruction = wantsPidgin
      ? 'When replying, translate content into West African Pidgin English while preserving the exact section headings and structure.'
      : 'Respond in clear, simple English.';

    const systemPrompt = `
You are FitFlow AI, a professional fitness coach. Use the provided user context to personalize responses.

MANDATES:
- ALWAYS include the following sections, in this exact order and spelled exactly as shown: Overview:, Key Points:, Action Plan:, Tips:.
- Separate each section by a blank line. Use a leading dash and a space for bullet lines (e.g. "- Point").
- Keep lines short; each idea must be on its own line. Do not produce long paragraphs.
- Never include raw internal IDs. You may summarize internal data but do not print database identifiers.
- If the user's message is a greeting, begin the response with a short, friendly greeting.
- ${languageInstruction}

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

    let reply = response.choices[0].message.content || '';

    // Ensure greeting when user greeted
    if (isGreeting) {
      const hasGreeting = /^\s*(hi|hello|hey|howdy|hiya|good morning|good afternoon|good evening)/i.test(reply);
      if (!hasGreeting) {
        const greetingText = wantsPidgin ? 'How far! ' : 'Hey! ';
        reply = `${greetingText}\n\n${reply}`;
      }
    }

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