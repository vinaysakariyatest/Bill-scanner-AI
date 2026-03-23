require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
async function run() {
  try {
    if (!process.env.CLAUDE_API_KEY || process.env.CLAUDE_API_KEY === 'YOUR_CLAUDE_API_KEY_HERE') {
      console.error("Please set CLAUDE_API_KEY in .env");
      return;
    }
    const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Hello' }],
    });
    console.log("Success:", response.content[0].text);
  } catch(e) {
    console.error("Error from Claude:", e.message);
  }
}
run();
