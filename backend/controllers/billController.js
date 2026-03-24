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

    const { path: tempPath, mimetype, filename } = req.file;
    const extractedDetails = await scanner.extractInvoiceDetails(tempPath, mimetype);

    // Convert file to base64 to bypass Vercel serverless storage constraints
    const fileBuffer = fs.readFileSync(tempPath);
    const base64Image = `data:${mimetype};base64,${fileBuffer.toString('base64')}`;

    // Clean up temporary Vercel storage
    fs.unlinkSync(tempPath);
    
    res.json({ ...extractedDetails, imageUrl: base64Image });
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
      items, contactInfo, imageUrl 
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

    // 2.5 Find or create Vendor
    let vendorId = undefined;
    if (customer.status !== 'pending') {
      const Vendor = require('../models/Vendor');
      let vendor = await Vendor.findOne({ name: vendorName });
      if (!vendor) {
        vendor = new Vendor({
          name: vendorName,
          gstNumber: vendorGstNumber || ''
        });
        await vendor.save();
      } else if (vendorGstNumber && !vendor.gstNumber) {
        vendor.gstNumber = vendorGstNumber;
        await vendor.save();
      }
      vendorId = vendor._id;
    }

    // 3. Create bill
    const bill = new Bill({
      invoiceNumber,
      invoiceDate,
      vendorName,
      vendorGstNumber,
      ...(vendorId && { vendorId }),
      customer: customer._id,
      customerGstNumber,
      items,
      subTotal,
      taxAmount,
      discountAmount,
      totalAmount,
      imageUrl
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

exports.updateBill = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedBill = await Bill.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.json({ message: 'Bill updated successfully', bill: updatedBill });
  } catch (error) {
    console.error("Update Bill Error:", error);
    res.status(500).json({ error: 'Failed to update bill', details: error.message });
  }
};
