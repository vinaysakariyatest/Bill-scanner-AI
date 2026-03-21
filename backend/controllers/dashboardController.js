const Customer = require('../models/Customer');
const Bill = require('../models/Bill');

exports.getDashboardData = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // 1. Get all customers
    const customers = await Customer.find().lean();
    console.log(`Found ${customers.length} customers`);
    
    // 2. We want to show how many bills and total amount each customer has
    const dashboardData = await Promise.all(customers.map(async (customer) => {
      let query = { customer: customer._id };
      
      // Add date filtering if month/year are provided
      if (month && year && month !== 'all' && year !== 'all') {
        const monthStr = String(month).padStart(2, '0');
        const yearStr = String(year);
        // Match invoiceDate starting with YYYY-MM
        query.invoiceDate = { $regex: new RegExp(`^${yearStr}-${monthStr}`) };
        console.log(`Filtering customer ${customer.name} with query:`, query);
      }

      const bills = await Bill.find(query).sort({ date: -1 }).lean();
      const totalSpent = bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
      console.log(`Customer ${customer.name}: ${bills.length} bills, ${totalSpent} spent`);
      
      return {
        ...customer,
        totalBills: bills.length,
        totalSpent,
        bills
      };
    }));

    res.json(dashboardData);
  } catch (error) {
    console.error("Dashboard Fetch Error:", error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

exports.getCustomerBills = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    let query = { customer: id };
    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = startDate;
      if (endDate) query.invoiceDate.$lte = endDate;
    }

    const bills = await Bill.find(query).sort({ invoiceDate: -1 }).lean();
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer bills' });
  }
};
