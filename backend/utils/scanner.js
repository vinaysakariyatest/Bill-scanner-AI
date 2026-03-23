const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

exports.extractInvoiceDetails = async (filePath, mimetype) => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error("GEMINI_API_KEY is missing or invalid in backend/.env file.");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });
  
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
- items (array of objects with: productName, hsnCode, qty, price, amount - DO NOT include overall discount as an item)`;

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    
    const parts = [
      { text: prompt },
      {
        inlineData: {
          mimeType: mimetype,
          data: base64Data
        }
      }
    ];

    console.log(`🔍 Extracting data with Gemini 2.0 Flash [${mimetype}]...`);

    const result = await model.generateContent(parts);
    const response = await result.response;
    const responseText = response.text();
    
    const parsedData = JSON.parse(responseText);
    
    // Safety Fallbacks
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
    console.error("Gemini AI Error:", error.message || error);
    throw new Error(`Failed to extract data. Details: ${error.message || 'Unknown error'}. Ensure your Gemini API Key is valid and the file is clear.`);
  }
};
