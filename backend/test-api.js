require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
async function run() {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      console.error("Please set GEMINI_API_KEY in .env");
      return;
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Hello");
    const response = await result.response;
    console.log("Success:", response.text());
  } catch(e) {
    console.error("Error from Gemini:", e.message);
  }
}
run();
