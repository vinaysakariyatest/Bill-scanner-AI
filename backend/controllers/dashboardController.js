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
      if (month && year && (month !== 'all' || year !== 'all') && month !== 'NaN') {
        let regexPattern = '^';
        if (year !== 'all') {
          regexPattern += String(year);
        } else {
          regexPattern += '\\d{4}'; // Any 4-digit year
        }
        
        regexPattern += '-';
        
        if (month !== 'all') {
          regexPattern += String(month).padStart(2, '0');
        } else {
          regexPattern += '\\d{2}'; // Any 2-digit month
        }
        
        // Match invoiceDate starting with YYYY-MM
        query.invoiceDate = { $regex: new RegExp(regexPattern) };
        console.log(`Filtering customer ${customer.name} with query:`, query);
      }

      const bills = await Bill.find(query).sort({ date: -1 }).lean();
      const totalSpent = bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
      const totalTax = bills.reduce((sum, bill) => sum + (bill.taxAmount || 0), 0);
      console.log(`Customer ${customer.name}: ${bills.length} bills, ${totalSpent} spent, ${totalTax} tax`);
      
      return {
        ...customer,
        totalBills: bills.length,
        totalSpent,
        totalTax,
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

exports.confirmCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndUpdate(id, { status: 'confirmed' }, { new: true });
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
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
