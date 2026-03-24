const axios = require('axios');
const fs = require('fs');
const path = require('path');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const scanner = require('../utils/scanner');
const notifier = require('../utils/notifier');

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
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
      
      const tempPath = path.join(uploadsDir, tempFileName);

      console.log(`📥 Downloading media [${mimeType}]: ${mediaUrl}`);
      await downloadFile(mediaUrl, tempPath);

      console.log(`🔍 Extracting data using AI (Model: Gemini 2.5 Flash)...`);
      const extractedData = await scanner.extractInvoiceDetails(tempPath, mimeType);

      // 5. Save to Bill & Customer
      // Find or create customer
      let isNewCustomer = false;
      let customer = await Customer.findOne({ name: extractedData.customerName });
      if (!customer) {
        customer = new Customer({
          name: extractedData.customerName,
          contactInfo: payload.from, // Store WhatsApp number as contact info
          mobileNumber: extractedData.customerMobileNumber || ''
        });
        await customer.save();
        isNewCustomer = true;
      } else if (extractedData.customerMobileNumber && !customer.mobileNumber) {
        customer.mobileNumber = extractedData.customerMobileNumber;
        await customer.save();
      }

      if (isNewCustomer) {
        notifier.sendNewCustomerAlert(extractedData.customerName).catch(err => console.error("WhatsApp Error:", err));
      }

      // Check for duplicate bill
      const existingBill = await Bill.findOne({ 
        invoiceNumber: extractedData.invoiceNumber, 
        vendorName: extractedData.vendorName 
      });

      if (!existingBill) {
        // Find or create Vendor only if customer is confirmed
        let vendorIdToAssign = undefined;
        if (customer.status !== 'pending') {
          const Vendor = require('../models/Vendor');
          let vendorObj = await Vendor.findOne({ name: extractedData.vendorName });
          if (!vendorObj) {
            vendorObj = new Vendor({
              name: extractedData.vendorName,
              gstNumber: extractedData.vendorGstNumber || ''
            });
            await vendorObj.save();
          } else if (extractedData.vendorGstNumber && !vendorObj.gstNumber) {
            vendorObj.gstNumber = extractedData.vendorGstNumber;
            await vendorObj.save();
          }
          vendorIdToAssign = vendorObj._id;
        }

        const bill = new Bill({
          ...extractedData,
          imageUrl: `/uploads/${tempFileName}`,
          ...(vendorIdToAssign && { vendorId: vendorIdToAssign }),
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

      // Image is now preserved for the dashboard view.
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
