import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, FileText, DollarSign, ChevronDown, ChevronUp, Loader2, Trash2 } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function DashboardPanel() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // New states for filtering
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState('overview'); // 'overview' or 'detail'
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchDashboard();
  }, [selectedMonth, selectedYear]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/dashboard`, {
        params: { month: selectedMonth, year: selectedYear }
      });
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

  const totalRevenue = data.reduce((sum, cust) => sum + (cust.totalSpent || 0), 0);
  const totalBills = data.reduce((sum, cust) => sum + (cust.totalBills || 0), 0);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const filteredBills = activeCustomer?.bills?.filter(bill => {
    const billDate = new Date(bill.date);
    const start = dateFilter.start ? new Date(dateFilter.start) : null;
    const end = dateFilter.end ? new Date(dateFilter.end) : null;
    if (start && billDate < start) return false;
    if (end && billDate > end) return false;
    return true;
  }) || [];

  const handleBackToOverview = () => {
    setViewMode('overview');
    setActiveCustomer(null);
  };

  const handleViewCustomerDetail = (customer) => {
    setActiveCustomer(customer);
    setViewMode('detail');
  };

  return (
    <div className="w-full animation-fade-in pb-12">
      {viewMode === 'overview' ? (
        <>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Customer Dashboard</h2>
              <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">Filtering by Invoice Date</p>
              <div className="flex items-center mt-3 space-x-3">
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  {months.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  {[2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 md:mt-0 flex space-x-4">
              <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center">
                <div className="bg-green-50 text-green-600 p-2 rounded-lg mr-3">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Monthly Revenue</p>
                  <p className="font-bold text-lg text-slate-800">${totalRevenue.toFixed(2)}</p>
                </div>
              </div>
              <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center">
                <div className="bg-blue-50 text-blue-600 p-2 rounded-lg mr-3">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Bills in {months[selectedMonth-1]}</p>
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
                <p className="text-slate-500 max-w-sm mb-6">No bills found for {months[selectedMonth-1]} {selectedYear}.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-bold">
                    <th className="px-6 py-4 rounded-tl-3xl">Customer Name</th>
                    <th className="px-6 py-4 text-center">Bills</th>
                    <th className="px-6 py-4">Revenue Contribution</th>
                    <th className="px-6 py-4 text-right rounded-tr-3xl">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((customer) => (
                    <tr key={customer._id} className="group border-b border-slate-50 transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-5">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold mr-4">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-800">{customer.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">{customer.totalBills}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-bold text-slate-700">${(customer.totalSpent || 0).toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button 
                          onClick={() => handleViewCustomerDetail(customer)}
                          className="text-xs font-bold text-primary-600 hover:text-primary-700 underline"
                        >
                          View All Bills
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <button 
              onClick={handleBackToOverview}
              className="flex items-center text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <Users className="w-4 h-4 mr-2" />
              Back to Customer List
            </button>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-100 flex items-center">
                <p className="text-[10px] text-slate-400 font-black uppercase mr-3">Customer Revenue</p>
                <p className="font-bold text-sm text-green-600">${filteredBills.reduce((s, b) => s + b.totalAmount, 0).toFixed(2)}</p>
              </div>
              <div className="flex items-center space-x-4 bg-white p-2 border border-slate-100 rounded-xl shadow-sm">
                <div className="flex items-center space-x-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">From</label>
                  <input 
                    type="date" 
                    value={dateFilter.start}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                    className="text-xs font-bold text-slate-700 outline-none border-0 p-1 bg-transparent"
                  />
                </div>
                <div className="w-px h-4 bg-slate-200"></div>
                <div className="flex items-center space-x-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">To</label>
                  <input 
                    type="date" 
                    value={dateFilter.end}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                    className="text-xs font-bold text-slate-700 outline-none border-0 p-1 bg-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 border border-slate-100">
            <div className="flex items-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary-500 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-primary-500/20 mr-6">
                {activeCustomer?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">{activeCustomer?.name}</h3>
                <p className="text-slate-500 text-sm">Customer Profile & Specific Activity</p>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Invoice #</th>
                    <th className="px-6 py-4">Billing Date</th>
                    <th className="px-6 py-4">Vendor Name</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">No bills found for the selected date range.</td>
                    </tr>
                  ) : (
                    filteredBills.map((bill) => (
                      <tr key={bill._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-700">{bill.invoiceNumber}</td>
                        <td className="px-6 py-4 text-slate-500 text-sm">{bill.invoiceDate || new Date(bill.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium text-sm">{bill.vendorName}</td>
                        <td className="px-6 py-4 text-right font-black text-slate-800">${bill.totalAmount.toFixed(2)}</td>

                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteBill(bill._id)}
                            disabled={deletingId === bill._id}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            {deletingId === bill._id ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredBills.length > 0 && (
              <div className="mt-6 flex justify-end">
                <div className="bg-slate-900 rounded-2xl px-6 py-4 text-right shadow-xl">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Bill Balance for Range</p>
                  <p className="text-2xl font-black text-white">
                    ${filteredBills.reduce((s, b) => s + b.totalAmount, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
