require('dotenv').config();
const { Mistral } = require('mistralai');
async function run() {
  try {
    if (!process.env.MISTRAL_API_KEY || process.env.MISTRAL_API_KEY === 'YOUR_MISTRAL_API_KEY_HERE') {
      console.error("Please set MISTRAL_API_KEY in .env");
      return;
    }
    const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
    const response = await client.chat.complete({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    console.log("Success:", response.choices[0].message.content);
  } catch(e) {
    console.error("Error from Mistral:", e.message);
  }
}
run();
