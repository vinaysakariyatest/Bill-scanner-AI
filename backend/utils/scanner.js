const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

exports.extractInvoiceDetails = async (filePath, mimetype) => {
  if (!process.env.CLAUDE_API_KEY || process.env.CLAUDE_API_KEY === 'YOUR_CLAUDE_API_KEY_HERE') {
    throw new Error("CLAUDE_API_KEY is missing or invalid in backend/.env file.");
  }

  const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
  
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
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    
    let contentBlock;
    if (mimetype === 'application/pdf') {
      contentBlock = {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64Data,
        },
      };
    } else {
      contentBlock = {
        type: "image",
        source: {
          type: "base64",
          media_type: mimetype,
          data: base64Data,
        },
      };
    }

    console.log(`🔍 Extracting data with Claude 3.5 Sonnet [${mimetype}]...`);

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            { type: "text", text: prompt }
          ],
        }
      ],
      // PDF support often requires this beta header in some SDK versions
      headers: mimetype === 'application/pdf' ? { "anthropic-beta": "pdfs-2024-09-25" } : {}
    });

    const responseText = message.content[0].text;
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
    console.error("Claude AI Error:", error.message || error);
    throw new Error(`Failed to extract data. Details: ${error.message || 'Unknown error'}. Ensure your Claude API Key is valid and the file is clear.`);
  }
};
