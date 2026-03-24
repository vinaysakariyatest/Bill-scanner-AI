const { GoogleGenerativeAI } = require("@google/generative-ai");
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const Bill = require('../models/Bill');

exports.askAssistant = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      return res.status(500).json({ error: "GEMINI_API_KEY is missing or invalid in backend/.env file." });
    }

    // 1. Gather Aggregated Database Snapshot
    console.log("🤖 AI Chat: Gathering Data Context...");

    // Get Active Confirmed Customers
    const confirmedCustomers = await Customer.find({ status: { $ne: 'pending' } }).lean();
    const confirmedIds = confirmedCustomers.map(c => c._id);
    
    // Global Stats
    const globalStats = await Bill.aggregate([
      { $match: { customer: { $in: confirmedIds } } },
      { $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
        totalTax: { $sum: "$taxAmount" },
        totalBills: { $sum: 1 }
      }}
    ]);

    // Top 30 Customers by Spend
    const topCustomersStat = await Bill.aggregate([
      { $match: { customer: { $in: confirmedIds } } },
      { $group: {
         _id: "$customer",
         totalSpent: { $sum: "$totalAmount" },
         totalTax: { $sum: "$taxAmount" },
         billsCount: { $sum: 1 }
      }},
      { $sort: { totalSpent: -1 } },
      { $limit: 30 }
    ]);
    
    // Map customer names
    const enrichedCustomers = topCustomersStat.map(stat => {
      const cust = confirmedCustomers.find(c => c._id.toString() === stat._id.toString());
      return {
        name: cust ? cust.name : 'Unknown',
        totalSpent: stat.totalSpent,
        totalTax: stat.totalTax,
        billsCount: stat.billsCount
      };
    });

    // Top 30 Vendors by Payable
    const topVendorsStat = await Bill.aggregate([
      { $match: { vendorId: { $ne: null } } },
      { $group: {
         _id: "$vendorId",
         totalOwed: { $sum: "$totalAmount" },
         totalTax: { $sum: "$taxAmount" },
         billsCount: { $sum: 1 }
      }},
      { $sort: { totalOwed: -1 } },
      { $limit: 30 }
    ]);

    const allVendors = await Vendor.find({ _id: { $in: topVendorsStat.map(v => v._id) } }).lean();
    
    // Map vendor names
    const enrichedVendors = topVendorsStat.map(stat => {
      const ven = allVendors.find(v => v._id.toString() === stat._id.toString());
      return {
        name: ven ? ven.name : 'Unknown',
        totalOwed: stat.totalOwed,
        totalTax: stat.totalTax,
        billsCount: stat.billsCount
      };
    });

    const pendingCount = await Customer.countDocuments({ status: 'pending' });

    const dataSnapshot = {
      globalMetrics: {
        totalRevenue: globalStats[0]?.totalRevenue || 0,
        totalTaxCollected: globalStats[0]?.totalTax || 0,
        totalInvoicesLogged: globalStats[0]?.totalBills || 0,
        totalConfirmedCustomers: confirmedIds.length,
        totalPendingCustomersWaitingForApproval: pendingCount
      },
      topCustomers: enrichedCustomers,
      topVendors: enrichedVendors
    };

    // 2. Setup Google Generative AI Prompts
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `You are the BillScanner Accounting AI Assistant. 
You act as an internal accountant/CFO answering queries from the business owner about their accounting dashboard.

CRITICAL RULES:
1. You MUST formulate your answers based STRICTLY on the JSON snapshot provided below.
2. If the user asks a question that cannot be answered using the provided JSON snapshot data, politely apologize and say "I'm sorry, I don't see that specific data in my current visibility snapshot."
3. Do NOT hallucinate data. Do NOT make up names or numbers.
4. You may speak in Hinglish (Hindi + English mix) or English depending on how the user asks. If they ask in English, reply in English. If they ask in Hindi/Hinglish, reply in Hinglish.
5. Be concise, professional, and directly answer the question formatting key numbers cleanly (e.g. ₹5,000).

=== LIVE DATABASE SNAPSHOT ===
${JSON.stringify(dataSnapshot, null, 2)}
==============================
`;

    console.log("🤖 Generating Response...");

    const chat = model.startChat({
      history: history || [],
      systemInstruction: { parts: [{ text: systemPrompt }] }
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    res.json({ response: responseText });
  } catch (error) {
    console.error("AI Assistant Error:", error);
    res.status(500).json({ error: "Failed to generate AI response. Please check limits or format." });
  }
};
