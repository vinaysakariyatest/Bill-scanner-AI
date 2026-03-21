const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

exports.extractInvoiceDetails = async (filePath, mimetype) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing in backend/.env file. Get it for FREE at: https://aistudio.google.com/app/apikey");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `You are a strict, professional CA invoice data extractor. Read the attached invoice perfectly.

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
- items (array of objects with: productName, qty, price, amount - DO NOT include overall discount as an item)

Return ONLY pure raw JSON code without markdown backticks.`;

  try {
    const fileBytes = fs.readFileSync(filePath);
    const documentPart = {
      inlineData: {
        data: Buffer.from(fileBytes).toString("base64"),
        mimeType: mimetype
      }
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [
            documentPart,
            { text: prompt }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsedData = JSON.parse(response.text);
    
    // Safety Fallbacks
    if (!parsedData.items) parsedData.items = [];
    if (!parsedData.subTotal) parsedData.subTotal = 0;
    if (!parsedData.taxAmount) parsedData.taxAmount = 0;
    if (!parsedData.discountAmount) parsedData.discountAmount = 0;
    
    // Ensure discount is always positive for logical subtraction
    parsedData.discountAmount = Math.abs(Number(parsedData.discountAmount) || 0);

    if (!parsedData.totalAmount) parsedData.totalAmount = 0;
    
    // Manual fallback calculation on empty totals
    let calcAmount = parsedData.items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    if (parsedData.subTotal === 0 && calcAmount > 0) parsedData.subTotal = calcAmount;
    if (parsedData.totalAmount === 0 && calcAmount > 0) parsedData.totalAmount = calcAmount + Number(parsedData.taxAmount) - Number(parsedData.discountAmount);

    if (!parsedData.invoiceNumber) parsedData.invoiceNumber = `INV-${Math.floor(Math.random() * 1000)}`;
    if (!parsedData.vendorName) parsedData.vendorName = 'Unknown Vendor';
    if (!parsedData.customerName) parsedData.customerName = 'Unknown Customer';

    return parsedData;

  } catch (error) {
    console.error("AI Extraction Error:", error.message || error);
    throw new Error(`Failed to extract data. Details: ${error.message || 'Unknown error'}. Ensure your Gemini API Key is valid and the image is clear.`);
  }
};
