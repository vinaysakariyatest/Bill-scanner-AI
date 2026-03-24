const Customer = require('../models/Customer');
const Bill = require('../models/Bill');

exports.getDashboardStats = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // Date filtering logic
    let dateFilter = {};
    if (month && year && (month !== 'all' || year !== 'all') && month !== 'NaN') {
        let regexPattern = '^';
        if (year !== 'all') regexPattern += String(year);
        else regexPattern += '\\d{4}';
        regexPattern += '-';
        if (month !== 'all') regexPattern += String(month).padStart(2, '0');
        else regexPattern += '\\d{2}';
        dateFilter.invoiceDate = { $regex: new RegExp(regexPattern) };
    }

    const confirmedCustomers = await Customer.find({ status: { $ne: 'pending' } }).select('_id').lean();
    const confirmedIds = confirmedCustomers.map(c => c._id);
    
    const billMatch = { customer: { $in: confirmedIds }, ...dateFilter };
    
    const statsResult = await Bill.aggregate([
      { $match: billMatch },
      { $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
        totalTax: { $sum: "$taxAmount" },
        totalBills: { $sum: 1 }
      }}
    ]);

    const stats = statsResult[0] || { totalRevenue: 0, totalTax: 0, totalBills: 0 };
    
    const pendingCount = await Customer.countDocuments({ status: 'pending' });
    const confirmedCount = confirmedIds.length;

    res.json({
      revenue: stats.totalRevenue,
      tax: stats.totalTax,
      billsCount: stats.totalBills,
      pendingCount,
      confirmedCount
    });
  } catch (err) {
    console.error("Dashboard Stats Fetch Error:", err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

exports.getCustomersPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status; // 'pending' or 'confirmed'
    const search = req.query.search || '';

    const query = {};
    if (status) {
      if (status === 'confirmed') query.status = { $ne: 'pending' };
      else query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { contactInfo: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const customerIds = customers.map(c => c._id);
    const billsStats = await Bill.aggregate([
      { $match: { customer: { $in: customerIds } } },
      { $group: {
         _id: "$customer",
         totalSpent: { $sum: "$totalAmount" },
         totalTax: { $sum: "$taxAmount" },
         totalBills: { $sum: 1 }
      }}
    ]);

    const statsMap = {};
    billsStats.forEach(stat => {
      statsMap[stat._id.toString()] = stat;
    });

    const enrichedCustomers = customers.map(c => {
      const stat = statsMap[c._id.toString()] || { totalSpent: 0, totalTax: 0, totalBills: 0 };
      return {
        ...c,
        totalSpent: stat.totalSpent,
        totalTax: stat.totalTax,
        totalBills: stat.totalBills
      };
    });

    res.json({
      customers: enrichedCustomers,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("getCustomersPaginated error:", error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

exports.getCustomerBills = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, page = 1, limit = 20 } = req.query;

    let query = { customer: id };
    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = startDate;
      if (endDate) query.invoiceDate.$lte = endDate;
    }

    const total = await Bill.countDocuments(query);
    const bills = await Bill.find(query)
      .sort({ invoiceDate: -1, date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      bills,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("getCustomerBills error:", error);
    res.status(500).json({ error: 'Failed to fetch customer bills' });
  }
};

exports.confirmCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndUpdate(id, { status: 'confirmed' }, { new: true });
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const Vendor = require('../models/Vendor');
    const unlinkedBills = await Bill.find({ customer: id, vendorId: { $exists: false } });
    
    for (const bill of unlinkedBills) {
      if (bill.vendorName) {
        let vendorObj = await Vendor.findOne({ name: bill.vendorName });
        if (!vendorObj) {
          vendorObj = new Vendor({
            name: bill.vendorName,
            gstNumber: bill.vendorGstNumber || ''
          });
          await vendorObj.save();
        } else if (bill.vendorGstNumber && !vendorObj.gstNumber) {
          vendorObj.gstNumber = bill.vendorGstNumber;
          await vendorObj.save();
        }
        bill.vendorId = vendorObj._id;
        await bill.save();
      }
    }
    
    res.json({ message: 'Customer confirmed gracefully', customer });
  } catch (error) {
    console.error("Confirm Customer Error:", error);
    res.status(500).json({ error: 'Failed to confirm customer' });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCustomer = await Customer.findByIdAndDelete(id);
    
    if (!deletedCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Also delete any bills associated with this customer
    await Bill.deleteMany({ customer: id });
    res.json({ message: 'Customer and associated bills deleted successfully' });
  } catch (error) {
    console.error("Delete Customer Error:", error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};
