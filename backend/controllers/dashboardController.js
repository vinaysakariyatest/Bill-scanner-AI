const Customer = require('../models/Customer');
const Bill = require('../models/Bill');

exports.getDashboardData = async (req, res) => {
  try {
    // 1. Get all customers
    const customers = await Customer.find().lean();
    
    // 2. We want to show how many bills and total amount each customer has
    const dashboardData = await Promise.all(customers.map(async (customer) => {
      const bills = await Bill.find({ customer: customer._id }).sort({ date: -1 }).lean();
      
      const totalSpent = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
      
      return {
        ...customer,
        totalBills: bills.length,
        totalSpent,
        bills
      };
    }));

    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};
