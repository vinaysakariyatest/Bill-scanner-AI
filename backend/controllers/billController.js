const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const scanner = require('../utils/scanner');
const notifier = require('../utils/notifier');
const fs = require('fs');

exports.uploadInvoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { path, mimetype } = req.file;
    const extractedDetails = await scanner.extractInvoiceDetails(path, mimetype);

    // Clean up the uploaded file to save space (since we only needed OCR)
    fs.unlinkSync(path);

    res.json(extractedDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process file' });
  }
};

exports.saveBill = async (req, res) => {
  try {
    const { 
      invoiceNumber, invoiceDate, vendorName, vendorGstNumber, 
      customerName, customerMobileNumber, customerGstNumber, subTotal, taxAmount, discountAmount, totalAmount, 
      items, contactInfo 
    } = req.body;

    // 1. Check for duplicate bill
    const existingBill = await Bill.findOne({ invoiceNumber, vendorName });
    if (existingBill) {
      return res.status(400).json({ error: 'Duplicate bill: This invoice from this vendor already exists.' });
    }

    // 2. Find or create customer
    let isNewCustomer = false;
    let customer = await Customer.findOne({ name: customerName });
    if (!customer) {
      customer = new Customer({
        name: customerName,
        contactInfo: contactInfo || '',
        mobileNumber: customerMobileNumber || ''
      });
      await customer.save();
      isNewCustomer = true;
    } else if (customerMobileNumber && !customer.mobileNumber) {
      customer.mobileNumber = customerMobileNumber;
      await customer.save();
    }

    if (isNewCustomer) {
      notifier.sendNewCustomerAlert(customerName).catch(err => console.error("WhatsApp Error:", err));
    }

    // 3. Create bill
    const bill = new Bill({
      invoiceNumber,
      invoiceDate,
      vendorName,
      vendorGstNumber,
      customer: customer._id,
      customerGstNumber,
      items,
      subTotal,
      taxAmount,
      discountAmount,
      totalAmount
    });
    await bill.save();

    res.status(201).json({ message: 'Bill saved successfully', bill });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save bill', details: error.message });
  }
};

exports.deleteBill = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBill = await Bill.findByIdAndDelete(id);
    
    if (!deletedBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bill' });
  }
};
