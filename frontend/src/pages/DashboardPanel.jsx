import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, FileText, DollarSign, ChevronDown, ChevronUp, Loader2, Trash2, LayoutDashboard, Clock } from 'lucide-react';

const API_BASE = '/api';

export default function DashboardPanel() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // New states for filtering & navigation
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [viewMode, setViewMode] = useState('overview'); // 'overview' or 'detail'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'pending', 'customers'
  
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const pendingCustomers = data.filter(c => c.status === 'pending');
  const confirmedCustomers = data.filter(c => c.status !== 'pending');

  const handleConfirmCustomer = async (customerId) => {
    try {
      await axios.put(`${API_BASE}/customers/${customerId}/confirm`);
      await fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to confirm customer");
    }
  };

  const totalRevenue = confirmedCustomers.reduce((sum, cust) => sum + (cust.totalSpent || 0), 0);
  const totalTax = confirmedCustomers.reduce((sum, cust) => sum + (cust.totalTax || 0), 0);
  const totalBills = confirmedCustomers.reduce((sum, cust) => sum + (cust.totalBills || 0), 0);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const filteredBills = activeCustomer?.bills?.filter(bill => {
    if (!dateFilter.start && !dateFilter.end) return true;
    
    // Normalize bill date to YYYY-MM-DD for string comparison
    const bDateStr = bill.invoiceDate || new Date(bill.date).toISOString().split('T')[0];
    
    if (dateFilter.start && bDateStr < dateFilter.start) return false;
    if (dateFilter.end && bDateStr > dateFilter.end) return false;
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
    <div className="w-full h-full flex bg-slate-50">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col shrink-0 overflow-y-auto hidden md:flex">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-3">Menu</h2>
        <nav className="space-y-1">
          <button 
            onClick={() => { setActiveTab('dashboard'); setViewMode('overview'); }} 
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center font-bold transition-all ${activeTab === 'dashboard' && viewMode === 'overview' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
          </button>
          <button 
            onClick={() => { setActiveTab('pending'); setViewMode('overview'); }} 
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center font-bold transition-all ${activeTab === 'pending' && viewMode === 'overview' ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <Clock className="w-5 h-5 mr-3" /> Pending
            {pendingCustomers.length > 0 && <span className="ml-auto bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">{pendingCustomers.length}</span>}
          </button>
          <button 
            onClick={() => { setActiveTab('customers'); setViewMode('overview'); }} 
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center font-bold transition-all ${activeTab === 'customers' || viewMode === 'detail' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <Users className="w-5 h-5 mr-3" /> Customers
          </button>
        </nav>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <div className="max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
          {viewMode === 'overview' ? (
            <>
              {activeTab === 'dashboard' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
                    <div>
                      <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Analytics Overview</h2>
                      <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">Global Data Filters</p>
                      <div className="flex items-center mt-3 space-x-3">
                        <select 
                          value={selectedMonth} 
                          onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm"
                        >
                          <option value="all">Total (All Months)</option>
                          {months.map((m, i) => (
                            <option key={m} value={i + 1}>{m}</option>
                          ))}
                        </select>
                        <select 
                          value={selectedYear} 
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm"
                        >
                          <option value="all">All Years</option>
                          {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex items-center col-span-1 md:col-span-1 lg:col-span-1">
                      <div className="bg-green-50 text-green-600 p-4 rounded-2xl mr-5">
                        <DollarSign className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedMonth === 'all' ? 'Overall Revenue' : 'Monthly Rev'}</p>
                        <p className="font-black text-xl lg:text-2xl text-slate-800 tracking-tight">₹{totalRevenue.toFixed(0)}</p>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex items-center col-span-1 md:col-span-1 lg:col-span-1">
                      <div className="bg-orange-50 text-orange-600 p-4 rounded-2xl mr-5">
                        <DollarSign className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total GST</p>
                        <p className="font-black text-xl lg:text-2xl text-slate-800 tracking-tight">₹{totalTax.toFixed(0)}</p>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex items-center col-span-1 md:col-span-1 lg:col-span-1">
                      <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl mr-5">
                        <FileText className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Bills Count</p>
                        <p className="font-black text-xl lg:text-2xl text-slate-800 tracking-tight">{totalBills}</p>
                      </div>
                    </div>
                    <div 
                      onClick={() => setActiveTab('customers')}
                      className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex items-center cursor-pointer hover:bg-primary-50 hover:border-primary-100 transition-colors group col-span-1 md:col-span-1 lg:col-span-1"
                    >
                      <div className="bg-indigo-50 text-indigo-600 group-hover:bg-primary-100 transition-colors p-4 rounded-2xl mr-5">
                        <Users className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest group-hover:text-primary-600 transition-colors">Customers</p>
                        <p className="font-black text-xl lg:text-2xl text-slate-800 tracking-tight group-hover:text-primary-700 transition-colors">{confirmedCustomers.length}</p>
                      </div>
                    </div>
                    <div 
                      onClick={() => setActiveTab('pending')}
                      className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex items-center cursor-pointer hover:bg-amber-50 hover:border-amber-100 transition-colors group col-span-1 md:col-span-2 lg:col-span-1"
                    >
                      <div className="bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors p-4 rounded-2xl mr-5 relative">
                        {pendingCustomers.length > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-amber-500 rounded-full animate-pulse transform translate-x-1/3 -translate-y-1/3 shadow-sm"></span>}
                        <Clock className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest group-hover:text-amber-600 transition-colors">Pending</p>
                        <p className="font-black text-xl lg:text-2xl text-slate-800 tracking-tight group-hover:text-amber-700 transition-colors">{pendingCustomers.length}</p>
                      </div>
                    </div>
                  </div>
                  
                  {loading && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-white rounded-3xl border border-slate-100">
                      <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
                      <p className="font-medium text-sm">Loading dashboard data...</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'pending' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="mb-8">
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Pending Approvals</h2>
                    <p className="text-sm text-slate-500 mt-1">Review and confirm new customers before they enter the system.</p>
                  </div>
                  
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
                      <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
                      <p className="font-medium text-sm text-slate-400">Loading pending customers...</p>
                    </div>
                  ) : pendingCustomers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 text-center shadow-xl shadow-slate-200/40">
                      <div className="bg-slate-50 p-6 rounded-full mb-6">
                        <Clock className="w-12 h-12 text-slate-300" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">No pending approvals</h3>
                      <p className="text-slate-500 max-w-sm">All new customers have been confirmed. You're all caught up!</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl shadow-xl shadow-amber-200/20 border border-amber-200 overflow-hidden">
                      <div className="bg-amber-50 px-6 py-4 border-b border-amber-200 flex justify-between items-center">
                        <h3 className="font-bold text-amber-800 flex items-center">
                          <span className="w-2 h-2 rounded-full bg-amber-500 mr-3 animate-pulse"></span>
                          {pendingCustomers.length} Customer{pendingCustomers.length > 1 ? 's' : ''} Waiting
                        </h3>
                      </div>
                      <table className="w-full text-left border-collapse">
                          <tbody>
                            {pendingCustomers.map((customer) => (
                              <tr key={customer._id} className="group border-b border-slate-50 transition-colors hover:bg-slate-50/50">
                                <td className="px-6 py-5">
                                  <div className="flex items-center">
                                    <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-black mr-4 text-lg">
                                      {customer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-800">{customer.name}</span>
                                      {(customer.mobileNumber || customer.contactInfo) && (
                                        <span className="text-xs font-semibold text-slate-400 mt-1">{customer.mobileNumber || customer.contactInfo}</span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-5 text-right flex items-center justify-end space-x-3">
                                  <button 
                                    onClick={async () => {
                                      if(window.confirm("Are you sure you want to completely reject/delete this pending customer? Their associated bills will also be deleted.")) {
                                        try {
                                          await axios.delete(`${API_BASE}/customers/${customer._id}`);
                                          await fetchDashboard();
                                        } catch (err) {
                                          alert(err.response?.data?.error || "Failed to delete customer");
                                        }
                                      }
                                    }}
                                    className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                                    title="Delete Customer"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => handleConfirmCustomer(customer._id)}
                                    className="bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-primary-500/20 active:scale-95"
                                  >
                                    Confirm Customer
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'customers' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
                    <div>
                      <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Customer Directory</h2>
                      <p className="text-sm text-slate-500 mt-1">Manage and view histories of all confirmed customers.</p>
                    </div>
                    <div className="mt-6 md:mt-0 relative">
                      <input 
                        type="text"
                        placeholder="Search Customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20 w-full md:w-80 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
                        <p className="font-medium text-sm">Loading customers...</p>
                      </div>
                    ) : confirmedCustomers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                        <div className="bg-slate-50 p-6 rounded-full mb-6">
                          <Users className="w-12 h-12 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No customers found</h3>
                        <p className="text-slate-500 max-w-sm mb-6">There are no confirmed customers matching your search or filters.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                            <th className="px-6 py-4 rounded-tl-3xl">Customer Name</th>
                            <th className="px-6 py-4 text-center">Bills</th>
                            <th className="px-6 py-4">Revenue Contribution</th>
                            <th className="px-6 py-4">Total GST</th>
                            <th className="px-6 py-4 text-right rounded-tr-3xl">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {confirmedCustomers.filter(c => 
                            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (c.mobileNumber && c.mobileNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (c.contactInfo && c.contactInfo.toLowerCase().includes(searchTerm.toLowerCase()))
                          ).map((customer) => (
                            <tr key={customer._id} className="group border-b border-slate-50 transition-colors hover:bg-slate-50/50">
                              <td className="px-6 py-5">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold mr-4">
                                    {customer.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800">{customer.name}</span>
                                    {(customer.mobileNumber || customer.contactInfo) && (
                                      <span className="text-[10px] font-bold text-slate-400 mt-1 tracking-wider uppercase">{customer.mobileNumber || customer.contactInfo}</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-center">
                                <span className="px-2 py-1 bg-slate-100/80 rounded-lg text-xs font-bold text-slate-600 border border-slate-200">{customer.totalBills}</span>
                              </td>
                              <td className="px-6 py-5">
                                <span className="font-bold text-slate-700">₹{(customer.totalSpent || 0).toFixed(2)}</span>
                              </td>
                              <td className="px-6 py-5">
                                <span className="font-bold text-orange-600">₹{(customer.totalTax || 0).toFixed(2)}</span>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <button 
                                  onClick={() => handleViewCustomerDetail(customer)}
                                  className="text-xs font-bold text-primary-600 hover:text-primary-700 hover:underline transition-all"
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
                </div>
              )}
            </>
          ) : (
            <div className="animate-in slide-in-from-bottom-2 duration-300">
              <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <button 
                  onClick={handleBackToOverview}
                  className="flex items-center text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Back to Customer List
                </button>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="bg-blue-50 text-primary-700 px-4 py-2.5 rounded-xl border border-primary-100 flex items-center">
                    <p className="text-[10px] font-black uppercase mr-3">Customer Revenue</p>
                    <p className="font-bold text-sm">₹{filteredBills.reduce((s, b) => s + b.totalAmount, 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-orange-50 text-orange-700 px-4 py-2.5 rounded-xl border border-orange-100 flex items-center">
                    <p className="text-[10px] font-black uppercase mr-3">Total GST</p>
                    <p className="font-bold text-sm">₹{filteredBills.reduce((s, b) => s + b.taxAmount, 0).toFixed(2)}</p>
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
                        <th className="px-6 py-4 text-right">GST</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredBills.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic">No bills found for the selected date range.</td>
                        </tr>
                      ) : (
                        filteredBills.map((bill) => (
                          <React.Fragment key={bill._id}>
                            <tr 
                              onClick={() => setExpandedInvoice(expandedInvoice === bill._id ? null : bill._id)}
                              className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                            >
                              <td className="px-6 py-4 font-bold text-slate-700">
                                <div className="flex items-center">
                                  {bill.invoiceNumber}
                                  {expandedInvoice === bill._id ? <ChevronUp className="w-3 h-3 ml-2 text-slate-400" /> : <ChevronDown className="w-3 h-3 ml-2 text-slate-400" />}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-500 text-sm">{bill.invoiceDate || new Date(bill.date).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-slate-600 font-medium text-sm">{bill.vendorName}</td>
                              <td className="px-6 py-4 text-right font-bold text-orange-600">₹{(bill.taxAmount || 0).toFixed(2)}</td>
                              <td className="px-6 py-4 text-right font-black text-slate-800">₹{bill.totalAmount.toFixed(2)}</td>

                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteBill(bill._id); }}
                                  disabled={deletingId === bill._id}
                                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                  {deletingId === bill._id ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                              </td>
                            </tr>
                            {expandedInvoice === bill._id && (
                              <tr className="bg-slate-50/30">
                                <td colSpan="6" className="px-10 py-6">
                                  <div className="animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Bill Line Items</h4>
                                      <div className="text-[10px] font-bold text-slate-500 flex gap-4">
                                        <span>Subtotal: ₹{bill.subTotal?.toFixed(2)}</span>
                                        <span>Tax: ₹{bill.taxAmount?.toFixed(2)}</span>
                                        {bill.discountAmount > 0 && <span>Discount: ₹{bill.discountAmount.toFixed(2)}</span>}
                                      </div>
                                    </div>
                                    <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                                      <table className="w-full text-xs">
                                        <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                                          <tr>
                                            <th className="px-4 py-2">Item Name</th>
                                            <th className="px-4 py-2">HSN/SAC</th>
                                            <th className="px-4 py-2 text-center">Qty</th>
                                            <th className="px-4 py-2 text-right">Price</th>
                                            <th className="px-4 py-2 text-right">Total</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                          {bill.items?.map((item, i) => (
                                            <tr key={i}>
                                              <td className="px-4 py-2.5 font-medium text-slate-700">{item.productName}</td>
                                              <td className="px-4 py-2.5 text-slate-500 uppercase">{item.hsnCode || '-'}</td>
                                              <td className="px-4 py-2.5 text-center text-slate-600">{item.qty}</td>
                                              <td className="px-4 py-2.5 text-right text-slate-600">₹{item.price?.toFixed(2)}</td>
                                              <td className="px-4 py-2.5 text-right font-bold text-slate-800">₹{item.amount?.toFixed(2)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredBills.length > 0 && (
                  <div className="mt-6 flex justify-end">
                    <div className="bg-white border border-slate-100 rounded-2xl px-6 py-4 text-right shadow-lg">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Bill Balance for Range</p>
                      <p className="text-2xl font-black text-primary-600">
                        ₹{filteredBills.reduce((s, b) => s + b.totalAmount, 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
