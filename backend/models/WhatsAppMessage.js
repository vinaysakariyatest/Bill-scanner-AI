const mongoose = require('mongoose');

const whatsappMessageSchema = new mongoose.Schema({
  messageId: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  receivedAt: { type: Date },
  contentType: { type: String },
  contentText: { type: String },
  mediaUrl: { type: String },
  senderName: { type: String },
  eventType: { type: String },
  rawPayload: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['received', 'processed', 'failed'], default: 'received' },
  error: { type: String },
  billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WhatsAppMessage', whatsappMessageSchema);
