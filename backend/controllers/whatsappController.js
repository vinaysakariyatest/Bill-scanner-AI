const axios = require('axios');
const fs = require('fs');
const path = require('path');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const scanner = require('../utils/scanner');

/**
 * Helper to download file from URL
 */
const downloadFile = async (url, outputPath) => {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};

exports.handleWebhook = async (req, res) => {
  const payload = req.body;
  console.log("📩 WhatsApp Webhook Received");

  try {
    // 1. Basic Validation (11za layout)
    if (!payload?.messageId || !payload?.from || !payload?.to) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    // 2. Log Message to MongoDB
    const newMessage = new WhatsAppMessage({
      messageId: payload.messageId,
      from: payload.from,
      to: payload.to,
      receivedAt: payload.receivedAt,
      contentType: payload.content?.contentType,
      contentText: payload.content?.text || null,
      mediaUrl: payload.content?.media?.url || null,
      senderName: payload.whatsapp?.senderName || null,
      eventType: payload.event,
      rawPayload: payload,
    });
    await newMessage.save();

    // 3. Process Only User Messages (MoMessage)
    if (payload.event !== "MoMessage") {
      return res.json({ success: true, message: "Non-user event ignored." });
    }

    // 4. Handle Media (Bills/Invoices)
    if (payload.content?.contentType === "media" && payload.content?.media?.url) {
      const mediaUrl = payload.content.media.url;
      let mimeType = payload.content.media.mimeType;
      
      console.log(`DEBUG: Received media with type: ${payload.content.contentType}, reported mimeType: ${mimeType}`);

      // Smarter mimeType detection if missing
      if (!mimeType) {
        if (mediaUrl.toLowerCase().includes('.pdf')) mimeType = 'application/pdf';
        else if (mediaUrl.toLowerCase().includes('.png')) mimeType = 'image/png';
        else mimeType = 'image/jpeg';
      }
      
      // Determine extension for local saving
      let ext = '.jpg';
      if (mimeType.includes('pdf')) ext = '.pdf';
      else if (mimeType.includes('png')) ext = '.png';

      const tempFileName = `wa-${Date.now()}${ext}`;
      const tempPath = path.join('/tmp', tempFileName);

      console.log(`📥 Downloading media [${mimeType}]: ${mediaUrl}`);
      await downloadFile(mediaUrl, tempPath);

      console.log(`🔍 Extracting data using AI (Model: gemini-1.5-flash)...`);
      const extractedData = await scanner.extractInvoiceDetails(tempPath, mimeType);

      // 5. Save to Bill & Customer
      // Find or create customer
      let customer = await Customer.findOne({ name: extractedData.customerName });
      if (!customer) {
        customer = new Customer({
          name: extractedData.customerName,
          contactInfo: payload.from // Store WhatsApp number as contact info
        });
        await customer.save();
      }

      // Check for duplicate bill
      const existingBill = await Bill.findOne({ 
        invoiceNumber: extractedData.invoiceNumber, 
        vendorName: extractedData.vendorName 
      });

      if (!existingBill) {
        const bill = new Bill({
          ...extractedData,
          customer: customer._id
        });
        await bill.save();
        
        // Update message status
        newMessage.status = 'processed';
        newMessage.billId = bill._id;
        await newMessage.save();
        
        console.log(`✅ Bill processed and saved: ${extractedData.invoiceNumber}`);
      } else {
        console.log(`⚠️ Duplicate bill detected, skipping save.`);
        newMessage.status = 'processed';
        newMessage.error = 'Duplicate bill detected';
        await newMessage.save();
      }

      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    
    // Log error to the message record if possible
    try {
      const msg = await WhatsAppMessage.findOne({ messageId: payload?.messageId });
      if (msg) {
        msg.status = 'failed';
        msg.error = error.message;
        await msg.save();
      }
    } catch (logErr) {
      console.error("Failed to log webhook error:", logErr);
    }

    res.status(500).json({ error: "Internal processing error" });
  }
};
