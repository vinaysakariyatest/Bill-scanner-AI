import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, FileText, DollarSign, ChevronDown, ChevronUp, Loader2, Trash2 } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function DashboardPanel() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API_BASE}/dashboard`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id) => {
    if (expandedRow === id) setExpandedRow(null);
    else setExpandedRow(id);
  };

  const handleDeleteBill = async (billId) => {
    if (!window.confirm("Are you sure you want to completely delete this invoice record? This cannot be undone.")) return;
    
    setDeletingId(billId);
    try {
      await axios.delete(`${API_BASE}/bills/${billId}`);
      await fetchDashboard(); // Refresh UI silently
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete bill");
    } finally {
      setDeletingId(null);
    }
  };

  const totalRevenue = data.reduce((sum, cust) => sum + cust.totalSpent, 0);
  const totalBills = data.reduce((sum, cust) => sum + cust.totalBills, 0);

  return (
    <div className="w-full animation-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Customer Dashboard</h2>
          <p className="text-slate-500 mt-2 text-sm text-balance">
            Overview of all your registered customers, their spending limits, and specific invoice history.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-4">
          <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center">
             <div className="bg-green-50 text-green-600 p-2 rounded-lg mr-3">
               <DollarSign className="w-5 h-5" />
             </div>
             <div>
               <p className="text-xs text-slate-400 font-semibold uppercase">Total Revenue</p>
               <p className="font-bold text-lg text-slate-800">${totalRevenue.toFixed(2)}</p>
             </div>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center">
             <div className="bg-blue-50 text-blue-600 p-2 rounded-lg mr-3">
               <FileText className="w-5 h-5" />
             </div>
             <div>
               <p className="text-xs text-slate-400 font-semibold uppercase">Invoices Scanned</p>
               <p className="font-bold text-lg text-slate-800">{totalBills}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
            <p className="font-medium text-sm">Loading dashboard data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="bg-slate-50 p-6 rounded-full mb-6">
              <Users className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No customers found</h3>
            <p className="text-slate-500 max-w-sm mb-6">Start by uploading and processing an invoice from the "Upload Bill" panel to populate this dashboard.</p>
          </div>
        ) : (
          <div className="w-full flex w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-bold">
                  <th className="px-6 py-4 rounded-tl-3xl">Customer Name</th>
                  <th className="px-6 py-4">Total Bills</th>
                  <th className="px-6 py-4">Total Spent</th>
                  <th className="px-6 py-4 text-right rounded-tr-3xl">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((customer) => (
                  <React.Fragment key={customer._id}>
                    <tr 
                      className={`group border-b border-slate-50 transition-colors hover:bg-slate-50/50 ${expandedRow === customer._id ? 'bg-primary-50/30' : ''}`}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-500 to-primary-400 text-white flex items-center justify-center font-bold shadow-md shadow-primary-500/20 mr-4">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{customer.name}</p>
                            <p className="text-xs text-slate-400 font-medium">Joined {new Date(customer.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {customer.totalBills} Invoices
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-bold text-slate-700">${customer.totalSpent.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button 
                          onClick={() => toggleRow(customer._id)}
                          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 transition-all shadow-sm group-active:scale-95 inline-flex items-center justify-center"
                        >
                          {expandedRow === customer._id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </td>
                    </tr>
                    
                    {expandedRow === customer._id && (
                      <tr>
                        <td colSpan="4" className="bg-slate-50/50 p-0 border-b border-slate-100">
                          <div className="p-6 md:p-8 animate-in slide-in-from-top-4 fade-in duration-300">
                            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
                              <FileText className="w-4 h-4 mr-2 text-primary-500" />
                              Invoice History
                            </h4>
                            {customer.bills && customer.bills.length > 0 ? (
                              <div className="bg-white border text-sm border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                                    <tr>
                                      <th className="px-4 py-3">Invoice #</th>
                                      <th className="px-4 py-3">Date</th>
                                      <th className="px-4 py-3">Vendor</th>
                                      <th className="px-4 py-3 text-right">Amount</th>
                                      <th className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {customer.bills.map((bill) => (
                                      <tr key={bill._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                        <td className="px-4 py-3 font-semibold text-slate-700">{bill.invoiceNumber}</td>
                                        <td className="px-4 py-3 text-slate-500">{new Date(bill.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-slate-500">{bill.vendorName}</td>
                                        <td className="px-4 py-3 text-right font-semibold">${bill.totalAmount.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right">
                                          <button 
                                            onClick={() => handleDeleteBill(bill._id)}
                                            disabled={deletingId === bill._id}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                            title="Delete Invoice"
                                          >
                                            {deletingId === bill._id ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Trash2 className="w-4 h-4" />}
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">No invoices found for this customer.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
