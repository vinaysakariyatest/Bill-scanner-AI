const Groq = require('groq-sdk');
const fs = require('fs');
const pdf = require('pdf-parse');

exports.extractInvoiceDetails = async (filePath, mimetype) => {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE') {
    throw new Error("GROQ_API_KEY is missing or invalid in backend/.env file.");
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  const prompt = `You are a strict, professional CA invoice data extractor. Read the provided invoice data perfectly.

CRITICAL RULE: NEVER guess or fabricate any names or numbers. If a field is missing, output "" or 0.
Read the tables carefully. The Total Amount should logically match the Subtotal + Tax.
  
Return a JSON object with EXACTLY these keys:
- invoiceNumber (string, empty if not found)
- invoiceDate (string, format YYYY-MM-DD)
- vendorName (string, name of the company issuing the bill)
- vendorGstNumber (string)
- customerName (string, whoever the bill is billed to)
- customerGstNumber (string)
- subTotal (number, total before tax)
- taxAmount (number, sum of all taxes like GST/IGST/VAT)
- discountAmount (number, overall discount/deduction applied to subtotal, 0 if none. Always return as a positive number)
- totalAmount (number, final amount including tax and minus discount)
- items (array of objects with: productName, hsnCode, qty, price, amount - DO NOT include overall discount as an item)

Return ONLY pure raw JSON code without markdown backticks.`;

  try {
    let responseText = "";
    const fileBytes = fs.readFileSync(filePath);

    if (mimetype === 'application/pdf') {
      // PDF Processing: Extract text then use Groq
      const data = await pdf(fileBytes);
      const extractedText = data.text.trim();

      if (!extractedText) {
        throw new Error("Could not extract text from PDF. It might be a scanned image-only PDF.");
      }

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "You are a specialized invoice parser. Return ONLY JSON." },
          { role: "user", content: `${prompt}\n\nInvoice Text Content:\n${extractedText}` }
        ],
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" }
      });
      responseText = chatCompletion.choices[0].message.content;
    } else {
      // Image Processing: Use Groq Vision
      const base64Image = fileBytes.toString('base64');
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimetype};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        response_format: { type: "json_object" }
      });
      responseText = chatCompletion.choices[0].message.content;
    }

    const parsedData = JSON.parse(responseText);
    
    // Safety Fallbacks (Consistent with previous logic)
    if (!parsedData.items) parsedData.items = [];
    if (!parsedData.subTotal) parsedData.subTotal = 0;
    if (!parsedData.taxAmount) parsedData.taxAmount = 0;
    if (!parsedData.discountAmount) parsedData.discountAmount = 0;
    
    parsedData.discountAmount = Math.abs(Number(parsedData.discountAmount) || 0);

    if (!parsedData.totalAmount) parsedData.totalAmount = 0;
    
    let calcAmount = parsedData.items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    if (parsedData.subTotal === 0 && calcAmount > 0) parsedData.subTotal = calcAmount;
    if (parsedData.totalAmount === 0 && calcAmount > 0) parsedData.totalAmount = calcAmount + Number(parsedData.taxAmount) - Number(parsedData.discountAmount);

    if (!parsedData.invoiceNumber) parsedData.invoiceNumber = `INV-${Math.floor(Math.random() * 1000)}`;
    if (!parsedData.vendorName) parsedData.vendorName = 'Unknown Vendor';
    if (!parsedData.customerName) parsedData.customerName = 'Unknown Customer';

    return parsedData;

  } catch (error) {
    console.error("AI Extraction Error:", error.message || error);
    throw new Error(`Failed to extract data. Details: ${error.message || 'Unknown error'}. Ensure your Groq API Key is valid and the file is clear.`);
  }
};
