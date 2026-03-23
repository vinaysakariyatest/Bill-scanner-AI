require('dotenv').config();
const Groq = require('groq-sdk');
async function run() {
  try {
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE') {
      console.error("Please set GROQ_API_KEY in .env");
      return;
    }
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    console.log("Success:", response.choices[0].message.content);
  } catch(e) {
    console.error("Error from Groq:", e.message);
  }
}
run();
