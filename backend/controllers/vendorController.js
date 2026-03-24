const Vendor = require('../models/Vendor');
const Bill = require('../models/Bill');

exports.getVendorsPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { gstNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Vendor.countDocuments(query);
    const vendors = await Vendor.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Aggregate statistics per vendor
    const vendorIds = vendors.map(v => v._id);
    const vendorStats = await Bill.aggregate([
      { $match: { vendorId: { $in: vendorIds } } },
      { $group: {
         _id: "$vendorId",
         totalOwed: { $sum: "$totalAmount" },
         totalTax: { $sum: "$taxAmount" },
         totalBills: { $sum: 1 }
      }}
    ]);

    const statsMap = {};
    vendorStats.forEach(stat => {
      if (stat._id) statsMap[stat._id.toString()] = stat;
    });

    const enrichedVendors = vendors.map(v => {
      const stat = statsMap[v._id.toString()] || { totalOwed: 0, totalTax: 0, totalBills: 0 };
      return {
        ...v,
        totalOwed: stat.totalOwed,
        totalTax: stat.totalTax,
        totalBills: stat.totalBills
      };
    });

    res.json({
      vendors: enrichedVendors,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("getVendors error:", error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
};
