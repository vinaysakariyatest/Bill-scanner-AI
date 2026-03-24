const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  productName: { type: String },
  hsnCode: { type: String },
  qty: { type: Number },
  price: { type: Number },
  amount: { type: Number }
});

const billSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true },
  invoiceDate: { type: String },
  vendorName: { type: String, required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  vendorGstNumber: { type: String },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerGstNumber: { type: String },
  items: [itemSchema],
  subTotal: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bill', billSchema);
