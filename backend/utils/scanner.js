const { Mistral } = require('@mistralai/mistralai');
const fs = require('fs');

exports.extractInvoiceDetails = async (filePath, mimetype) => {
  if (!process.env.MISTRAL_API_KEY || process.env.MISTRAL_API_KEY === 'YOUR_MISTRAL_API_KEY_HERE') {
    throw new Error("MISTRAL_API_KEY is missing or invalid in backend/.env file.");
  }

  const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  
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

  let fileId = null;
  try {
    console.log(`📤 Uploading file to Mistral (${mimetype})...`);
    
    // 1. Upload file to Mistral
    const uploadResponse = await client.files.upload({
      file: fs.createReadStream(filePath),
      purpose: "ocr"
    });
    fileId = uploadResponse.id;

    console.log(`🌀 Running Mistral OCR on fileId: ${fileId}...`);
    
    // 2. Process with Mistral OCR using the fileId
    const ocrResponse = await client.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "file",
        fileId: fileId
      }
    });

    // Combine text from all pages
    const extractedText = ocrResponse.pages.map(page => page.markdown).join('\n\n');

    if (!extractedText.trim()) {
      throw new Error("Mistral OCR failed to extract any text from the document.");
    }

    console.log(`🧠 Processing extracted text with Mistral LLM...`);

    // 3. Structured Extraction with Mistral Large
    const chatResponse = await client.chat.complete({
      model: "mistral-large-latest",
      messages: [
        { role: "system", content: "You are a specialized invoice parser. Return ONLY JSON." },
        { role: "user", content: `${prompt}\n\nInvoice OCR Content:\n${extractedText}` }
      ],
      responseFormat: { type: "json_object" }
    });

    // Cleanup: Delete the file from Mistral after processing
    try {
      await client.files.delete({ fileId });
    } catch (cleanupErr) {
      console.warn("Mistral file cleanup failed:", cleanupErr.message);
    }

    const responseText = chatResponse.choices[0].message.content;
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
    if (fileId) {
      try { await client.files.delete({ fileId }); } catch(err) {}
    }
    console.error("Mistral AI Error:", error.message || error);
    throw new Error(`Failed to extract data. Details: ${error.message || 'Unknown error'}. Ensure your Mistral API Key is valid and the file is supported.`);
  }
};
