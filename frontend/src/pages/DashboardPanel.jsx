import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Users, FileText, DollarSign, ChevronDown, ChevronUp, Loader2, Trash2, LayoutDashboard, Clock, Edit, Eye, X } from 'lucide-react';

const API_BASE = '/api';

const PaginationControls = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="flex justify-center items-center space-x-4 p-4 bg-white/50 border-t border-slate-100 mt-2 rounded-b-3xl">
      <button 
        disabled={currentPage <= 1} 
        onClick={() => onPageChange(currentPage - 1)}
        className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold disabled:opacity-50 hover:bg-slate-200 transition-colors shadow-sm text-sm"
      >
        Previous
      </button>
      <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
        Page {currentPage} of {Math.max(1, totalPages)}
      </span>
      <button 
        disabled={currentPage >= totalPages || totalPages === 0} 
        onClick={() => onPageChange(currentPage + 1)}
        className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold disabled:opacity-50 hover:bg-slate-200 transition-colors shadow-sm text-sm"
      >
        Next
      </button>
    </div>
  );
};

export default function DashboardPanel() {
  // Global View States
  const [viewMode, setViewMode] = useState('overview'); // 'overview' or 'detail'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'pending', 'customers'
  
  // Dashboard Stats
  const [stats, setStats] = useState({ revenue: 0, tax: 0, billsCount: 0, pendingCount: 0, confirmedCount: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Confirmed Customers Pagination
  const [customers, setCustomers] = useState([]);
  const [custPage, setCustPage] = useState(1);
  const [custTotalPages, setCustTotalPages] = useState(1);
  const [custLoading, setCustLoading] = useState(false);
  
  // Pending Customers Pagination
  const [pending, setPending] = useState([]);
  const [pendPage, setPendPage] = useState(1);
  const [pendTotalPages, setPendTotalPages] = useState(1);
  const [pendLoading, setPendLoading] = useState(false);

  // Vendor Pagination
  const [vendors, setVendors] = useState([]);
  const [venPage, setVenPage] = useState(1);
  const [venTotalPages, setVenTotalPages] = useState(1);
  const [venLoading, setVenLoading] = useState(false);

  // Active Customer Bills Pagination
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [bills, setBills] = useState([]);
  const [billPage, setBillPage] = useState(1);
  const [billTotalPages, setBillTotalPages] = useState(1);
  const [billLoading, setBillLoading] = useState(false);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // UI Interactive States
  const [expandedRow, setExpandedRow] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editingBillId, setEditingBillId] = useState(null);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [viewImage, setViewImage] = useState(null);
  const [editForm, setEditForm] = useState({ 
    invoiceNumber: '', invoiceDate: '', vendorName: '', 
    taxAmount: 0, totalAmount: 0, items: [] 
  });

  // Re-fetch Stats when Date Global Filters change
  useEffect(() => {
    fetchStats();
  }, [selectedMonth, selectedYear]);

  // Re-fetch Customers when search or page changes
  const searchTimeout = useRef(null);
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchCustomers();
      fetchPending();
      fetchVendors();
    }, 500); // Debounce search
    return () => clearTimeout(searchTimeout.current);
  }, [searchTerm, custPage, pendPage, venPage]);

  // Re-fetch bills if we are in detail view and filters/page change
  useEffect(() => {
    if (activeCustomer) {
      fetchBills();
    }
  }, [activeCustomer?._id, billPage, dateFilter]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/dashboard/stats`, {
        params: { month: selectedMonth, year: selectedYear }
      });
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    setCustLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/customers`, {
        params: { status: 'confirmed', page: custPage, limit: 10, search: searchTerm }
      });
      setCustomers(res.data.customers);
      setCustTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setCustLoading(false);
    }
  };

  const fetchPending = async () => {
    setPendLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/customers`, {
        params: { status: 'pending', page: pendPage, limit: 10, search: searchTerm }
      });
      setPending(res.data.customers);
      setPendTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setPendLoading(false);
    }
  };

  const fetchVendors = async () => {
    setVenLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/vendors`, {
        params: { page: venPage, limit: 10, search: searchTerm }
      });
      setVendors(res.data.vendors);
      setVenTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setVenLoading(false);
    }
  };

  const fetchBills = async () => {
    if (!activeCustomer) return;
    setBillLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/customers/${activeCustomer._id}/bills`, {
        params: { page: billPage, limit: 15, startDate: dateFilter.start, endDate: dateFilter.end }
      });
      setBills(res.data.bills);
      setBillTotalPages(res.data.totalPages);
      
      // Keep local customer copy synced with new db values to ensure header amounts match
      const cRes = await axios.get(`${API_BASE}/customers`, { params: { search: activeCustomer.name, limit: 1 } });
      if (cRes.data.customers.length > 0) {
        setActiveCustomer(prev => ({ ...prev, ...cRes.data.customers[0] }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBillLoading(false);
    }
  };

  const handleDeleteVendor = async (vendorId) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-slate-800">Delete this vendor?</p>
        <p className="text-xs text-slate-500">Associated bills will be unlinked but not deleted.</p>
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={async () => {
            toast.dismiss(t.id);
            setDeletingId(vendorId);
            try {
              await axios.delete(`${API_BASE}/vendors/${vendorId}`);
              toast.success("Vendor deleted gracefully");
              await fetchVendors();
            } catch (err) {
              toast.error(err.response?.data?.error || "Failed to delete vendor");
            } finally {
              setDeletingId(null);
            }
          }} className="px-3 py-1.5 text-xs font-bold bg-red-500 text-white hover:bg-red-600 rounded-lg shadow-sm">Delete</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const handleDeleteBill = async (billId) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-slate-800">Delete this invoice record?</p>
        <p className="text-xs text-slate-500">This action cannot be undone.</p>
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={async () => {
            toast.dismiss(t.id);
            setDeletingId(billId);
            try {
              await axios.delete(`${API_BASE}/bills/${billId}`);
              toast.success("Bill deleted entirely");
              await fetchBills();
              await fetchStats();
              await fetchCustomers();
            } catch (err) {
              toast.error(err.response?.data?.error || "Failed to delete bill");
            } finally {
              setDeletingId(null);
            }
          }} className="px-3 py-1.5 text-xs font-bold bg-red-500 text-white hover:bg-red-600 rounded-lg shadow-sm">Delete</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const handleEditClick = (bill) => {
    setEditingBillId(bill._id);
    setEditForm({
      invoiceNumber: bill.invoiceNumber,
      invoiceDate: bill.invoiceDate || new Date(bill.date).toISOString().split('T')[0],
      vendorName: bill.vendorName,
      taxAmount: bill.taxAmount || 0,
      totalAmount: bill.totalAmount || 0,
      items: bill.items ? JSON.parse(JSON.stringify(bill.items)) : []
    });
    setExpandedInvoice(bill._id);
  };

  const handleEditSave = async (billId) => {
    try {
      const formattedItems = (editForm.items || []).map(item => ({
        ...item,
        qty: Number(item.qty) || 1,
        price: Number(item.price) || 0,
        amount: Number(item.amount) || ((Number(item.qty) || 1) * (Number(item.price) || 0))
      }));

      await axios.put(`${API_BASE}/bills/${billId}`, {
        ...editForm,
        taxAmount: Number(editForm.taxAmount),
        totalAmount: Number(editForm.totalAmount),
        items: formattedItems
      });
      toast.success("Bill updated successfully!");
      setEditingBillId(null);
      await fetchBills();
      await fetchStats();
      await fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update bill");
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...(editForm.items || [])];
    if (!newItems[index]) return;
    
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'qty' || field === 'price') {
      const qty = Number(newItems[index].qty) || 0;
      const price = Number(newItems[index].price) || 0;
      newItems[index].amount = qty * price;
    }
    
    setEditForm({ ...editForm, items: newItems });
  };

  const handleConfirmCustomer = async (customerId) => {
    try {
      await axios.put(`${API_BASE}/customers/${customerId}/confirm`);
      toast.success("Customer confirmed!");
      await fetchPending();
      await fetchCustomers();
      await fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to confirm customer");
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleBackToOverview = () => {
    setViewMode('overview');
    setActiveCustomer(null);
    setBillPage(1);
    setDateFilter({ start: '', end: '' });
  };

  const handleViewCustomerDetail = (customer) => {
    setActiveCustomer(customer);
    setViewMode('detail');
  };

  const handleExportCustomers = async () => {
    try {
      const toastId = toast.loading("Fetching all records for export...");
      const res = await axios.get(`${API_BASE}/customers`, { params: { status: 'confirmed', limit: 100000 } });
      const exportData = res.data.customers.map(c => ({
        'Customer Name': c.name,
        'Mobile Number': c.mobileNumber || '-',
        'Contact Info': c.contactInfo || '-',
        'Total Bills': c.totalBills,
        'Total Spends (₹)': c.totalSpent?.toFixed(2) || '0.00',
        'Total GST (₹)': c.totalTax?.toFixed(2) || '0.00'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
      
      const fileName = `Customers_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.dismiss(toastId);
      toast.success("Excel file successfully generated!");
    } catch (err) {
      toast.error("Failed to generate export");
      console.error(err);
    }
  };

  const handleExportBills = async () => {
    if (!activeCustomer) return;
    try {
      const toastId = toast.loading("Compiling all bills for export...");
      // Fetch all bills ignoring pagination for export
      const res = await axios.get(`${API_BASE}/customers/${activeCustomer._id}/bills`, {
        params: { limit: 100000, startDate: dateFilter.start, endDate: dateFilter.end }
      });
      const allBills = res.data.bills;
      if (allBills.length === 0) {
          toast.dismiss(toastId);
          return toast.error("No bills available to export");
      }

      const exportData = allBills.map(b => ({
        'Bill ID': b._id,
        'Invoice Number': b.invoiceNumber,
        'Vendor Name': b.vendorName,
        'Date': b.invoiceDate || new Date(b.date).toLocaleDateString(),
        'Subtotal (₹)': b.subTotal?.toFixed(2) || '0.00',
        'Discount (₹)': b.discountAmount?.toFixed(2) || '0.00',
        'GST Amount (₹)': b.taxAmount?.toFixed(2) || '0.00',
        'Total Amount (₹)': b.totalAmount?.toFixed(2) || '0.00'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `${activeCustomer.name} Bills`);
      
      const fileName = `Bills_${activeCustomer.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.dismiss(toastId);
      toast.success("Excel export successful!");
    } catch (err) {
      toast.error("Failed to generate export");
      console.error(err);
    }
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
            {stats.pendingCount > 0 && <span className="ml-auto bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">{stats.pendingCount}</span>}
          </button>
          <button 
            onClick={() => { setActiveTab('customers'); setViewMode('overview'); }} 
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center font-bold transition-all ${activeTab === 'customers' || viewMode === 'detail' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <Users className="w-5 h-5 mr-3" /> Customers
          </button>
          <button 
            onClick={() => { setActiveTab('vendors'); setViewMode('overview'); }} 
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center font-bold transition-all ${activeTab === 'vendors' && viewMode === 'overview' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <DollarSign className="w-5 h-5 mr-3" /> Vendors
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
                        <p className="font-black text-xl lg:text-2xl text-slate-800 tracking-tight">
                          {statsLoading ? <Loader2 className="w-4 h-4 animate-spin my-1" /> : `₹${(stats.revenue || 0).toFixed(0)}`}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex items-center col-span-1 md:col-span-1 lg:col-span-1">
                      <div className="bg-orange-50 text-orange-600 p-4 rounded-2xl mr-5">
                        <DollarSign className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total GST</p>
                        <p className="font-black text-xl lg:text-2xl text-slate-800 tracking-tight">
                          {statsLoading ? <Loader2 className="w-4 h-4 animate-spin my-1" /> : `₹${(stats.tax || 0).toFixed(0)}`}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex items-center col-span-1 md:col-span-1 lg:col-span-1">
                      <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl mr-5">
                        <FileText className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Bills Count</p>
                        <p className="font-black text-xl lg:text-2xl text-slate-800 tracking-tight">
                          {statsLoading ? <Loader2 className="w-4 h-4 animate-spin my-1" /> : (stats.billsCount || 0)}
                        </p>
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
                        <p className="font-black text-xl lg:text-2xl text-slate-800 tracking-tight group-hover:text-primary-700 transition-colors">
                          {statsLoading ? <Loader2 className="w-4 h-4 animate-spin my-1" /> : (stats.confirmedCount || 0)}
                        </p>
                      </div>
                    </div>
                    <div 
                      onClick={() => setActiveTab('pending')}
                      className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex items-center cursor-pointer hover:bg-amber-50 hover:border-amber-100 transition-colors group col-span-1 md:col-span-2 lg:col-span-1"
                    >
                      <div className="bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors p-4 rounded-2xl mr-5 relative">
                        {stats.pendingCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-amber-500 rounded-full animate-pulse transform translate-x-1/3 -translate-y-1/3 shadow-sm"></span>}
                        <Clock className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest group-hover:text-amber-600 transition-colors">Pending</p>
                        <p className="font-black text-xl lg:text-2xl text-slate-800 tracking-tight group-hover:text-amber-700 transition-colors">
                          {statsLoading ? <Loader2 className="w-4 h-4 animate-spin my-1" /> : (stats.pendingCount || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pending' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="mb-8">
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Pending Approvals</h2>
                    <p className="text-sm text-slate-500 mt-1">Review and confirm new customers before they enter the system.</p>
                  </div>
                  
                  {pendLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
                      <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
                      <p className="font-medium text-sm text-slate-400">Loading pending customers...</p>
                    </div>
                  ) : pending.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 text-center shadow-xl shadow-slate-200/40">
                      <div className="bg-slate-50 p-6 rounded-full mb-6">
                        <Clock className="w-12 h-12 text-slate-300" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">No pending approvals</h3>
                      <p className="text-slate-500 max-w-sm">All new customers have been confirmed. You're all caught up!</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl shadow-xl shadow-amber-200/20 border border-amber-200 overflow-hidden flex flex-col">
                      <div className="bg-amber-50 px-6 py-4 border-b border-amber-200 flex justify-between items-center shrink-0">
                        <h3 className="font-bold text-amber-800 flex items-center">
                          <span className="w-2 h-2 rounded-full bg-amber-500 mr-3 animate-pulse"></span>
                          {stats.pendingCount} Customer{stats.pendingCount > 1 ? 's' : ''} Waiting
                        </h3>
                      </div>
                      <table className="w-full text-left border-collapse shrink-0">
                          <tbody>
                            {pending.map((customer) => (
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
                                    onClick={() => {
                                      toast((t) => (
                                        <div className="flex flex-col gap-3">
                                          <p className="font-bold text-slate-800">Reject and delete customer?</p>
                                          <p className="text-xs text-slate-500">Associated bills will also be permanently deleted.</p>
                                          <div className="flex justify-end gap-2 mt-2">
                                            <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                                            <button onClick={async () => {
                                              toast.dismiss(t.id);
                                              try {
                                                await axios.delete(`${API_BASE}/customers/${customer._id}`);
                                                toast.success("Customer and bills discarded");
                                                await fetchPending();
                                                await fetchStats();
                                              } catch (err) {
                                                toast.error(err.response?.data?.error || "Failed to delete customer");
                                              }
                                            }} className="px-3 py-1.5 text-xs font-bold bg-red-500 text-white hover:bg-red-600 rounded-lg shadow-sm">Reject</button>
                                          </div>
                                        </div>
                                      ), { duration: Infinity });
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
                      <PaginationControls currentPage={pendPage} totalPages={pendTotalPages} onPageChange={setPendPage} />
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
                    <div className="mt-6 md:mt-0 flex flex-col md:flex-row items-center gap-3">
                      <button 
                        onClick={handleExportCustomers}
                        className="bg-green-50 hover:bg-green-100 text-green-700 font-bold px-4 py-2.5 rounded-xl border border-green-200 transition-colors flex items-center shadow-sm w-full md:w-auto justify-center"
                      >
                        <FileText className="w-4 h-4 mr-2" /> Export to Excel
                      </button>
                      <input 
                        type="text"
                        placeholder="Search Customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20 w-full md:w-64 lg:w-80 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col">
                    {custLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
                        <p className="font-medium text-sm">Loading customers...</p>
                      </div>
                    ) : customers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                        <div className="bg-slate-50 p-6 rounded-full mb-6">
                          <Users className="w-12 h-12 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No customers found</h3>
                        <p className="text-slate-500 max-w-sm mb-6">There are no confirmed customers matching your search or filters.</p>
                      </div>
                    ) : (
                      <>
                        <table className="w-full text-left border-collapse shrink-0">
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
                            {customers.map((customer) => (
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
                        <PaginationControls currentPage={custPage} totalPages={custTotalPages} onPageChange={setCustPage} />
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'vendors' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
                    <div>
                      <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Vendor Management</h2>
                      <p className="text-sm text-slate-500 mt-1">Track liabilities and performance of internal vendors.</p>
                    </div>
                    <div className="mt-6 md:mt-0 flex flex-col md:flex-row items-center gap-3">
                      <input 
                        type="text"
                        placeholder="Search Vendors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20 w-full md:w-64 lg:w-80 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col">
                    {venLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-4" />
                        <p className="font-medium text-sm">Loading vendors...</p>
                      </div>
                    ) : vendors.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                        <div className="bg-slate-50 p-6 rounded-full mb-6">
                          <DollarSign className="w-12 h-12 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No vendors found</h3>
                        <p className="text-slate-500 max-w-sm mb-6">There are no vendors matching your search or filters.</p>
                      </div>
                    ) : (
                      <>
                        <table className="w-full text-left border-collapse shrink-0">
                          <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                              <th className="px-6 py-4 rounded-tl-3xl">Vendor Name</th>
                              <th className="px-6 py-4 text-center">Invoices Logged</th>
                              <th className="px-6 py-4">Total Payables</th>
                              <th className="px-6 py-4">Tax Component</th>
                              <th className="px-6 py-4 text-right rounded-tr-3xl">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendors.map((vendor) => (
                              <tr key={vendor._id} className="group border-b border-slate-50 transition-colors hover:bg-slate-50/50">
                                <td className="px-6 py-5">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold mr-4">
                                      {vendor.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-800">{vendor.name}</span>
                                      {(vendor.gstNumber) && (
                                        <span className="text-[10px] font-bold text-slate-400 mt-1 tracking-wider uppercase">GST: {vendor.gstNumber}</span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                  <span className="px-2 py-1 bg-slate-100/80 rounded-lg text-xs font-bold text-slate-600 border border-slate-200">{vendor.totalBills}</span>
                                </td>
                                <td className="px-6 py-5">
                                  <span className="font-bold text-slate-700">₹{(vendor.totalOwed || 0).toFixed(2)}</span>
                                </td>
                                <td className="px-6 py-5">
                                  <span className="font-bold text-orange-600">₹{(vendor.totalTax || 0).toFixed(2)}</span>
                                </td>
                                <td className="px-6 py-5 text-right">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteVendor(vendor._id); }}
                                    disabled={deletingId === vendor._id}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    title="Delete Vendor"
                                  >
                                    {deletingId === vendor._id ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Trash2 className="w-4 h-4" />}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <PaginationControls currentPage={venPage} totalPages={venTotalPages} onPageChange={setVenPage} />
                      </>
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
                  <button 
                    onClick={handleExportBills}
                    className="bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2.5 rounded-xl border border-green-200 flex items-center shadow-sm font-bold transition-colors w-full md:w-auto justify-center mb-2 md:mb-0 md:mr-2"
                  >
                    <FileText className="w-4 h-4 mr-2" /> Export Bills
                  </button>
                  <div className="bg-blue-50 text-primary-700 px-4 py-2.5 rounded-xl border border-primary-100 flex items-center">
                    <p className="text-[10px] font-black uppercase mr-3">Customer Revenue</p>
                    <p className="font-bold text-sm">₹{(activeCustomer?.totalSpent || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-orange-50 text-orange-700 px-4 py-2.5 rounded-xl border border-orange-100 flex items-center">
                    <p className="text-[10px] font-black uppercase mr-3">Total GST</p>
                    <p className="font-bold text-sm">₹{(activeCustomer?.totalTax || 0).toFixed(2)}</p>
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

              <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col">
                <div className="flex items-center mb-8 shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-primary-500 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-primary-500/20 mr-6">
                    {activeCustomer?.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{activeCustomer?.name}</h3>
                    <p className="text-slate-500 text-sm">Customer Profile & Specific Activity</p>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden shrink-0">
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
                      {billLoading ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-400" />
                            Loading bills...
                          </td>
                        </tr>
                      ) : bills.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic">No bills found for the selected date range.</td>
                        </tr>
                      ) : (
                        bills.map((bill) => (
                          <React.Fragment key={bill._id}>
                            <tr 
                              onClick={() => editingBillId !== bill._id && setExpandedInvoice(expandedInvoice === bill._id ? null : bill._id)}
                              className={`transition-colors cursor-pointer group ${editingBillId === bill._id ? 'bg-primary-50/40' : 'hover:bg-slate-50/50'}`}
                            >
                              <td className="px-6 py-4 font-bold text-slate-700">
                                {editingBillId === bill._id ? (
                                  <input type="text" value={editForm.invoiceNumber} onChange={e => setEditForm({...editForm, invoiceNumber: e.target.value})} className="border border-primary-200 rounded px-2 py-1.5 w-full text-sm font-bold bg-white focus:ring-2 focus:ring-primary-500/20 outline-none shadow-sm" />
                                ) : (
                                  <div className="flex items-center">
                                    {bill.invoiceNumber}
                                    {expandedInvoice === bill._id ? <ChevronUp className="w-3 h-3 ml-2 text-slate-400" /> : <ChevronDown className="w-3 h-3 ml-2 text-slate-400" />}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-slate-500 text-sm">
                                {editingBillId === bill._id ? (
                                  <input type="date" value={editForm.invoiceDate} onChange={e => setEditForm({...editForm, invoiceDate: e.target.value})} className="border border-primary-200 rounded px-2 py-1.5 w-full text-sm font-bold bg-white focus:ring-2 focus:ring-primary-500/20 outline-none shadow-sm" />
                                ) : (
                                  bill.invoiceDate || new Date(bill.date).toLocaleDateString()
                                )}
                              </td>
                              <td className="px-6 py-4 text-slate-600 font-medium text-sm">
                                {editingBillId === bill._id ? (
                                  <input type="text" value={editForm.vendorName} onChange={e => setEditForm({...editForm, vendorName: e.target.value})} className="border border-primary-200 rounded px-2 py-1.5 w-full text-sm font-bold bg-white focus:ring-2 focus:ring-primary-500/20 outline-none shadow-sm" />
                                ) : (
                                  bill.vendorName
                                )}
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-orange-600">
                                {editingBillId === bill._id ? (
                                  <input type="number" step="0.01" value={editForm.taxAmount} onChange={e => setEditForm({...editForm, taxAmount: e.target.value})} className="border border-primary-200 rounded px-2 py-1.5 w-24 text-right text-sm font-bold bg-white focus:ring-2 focus:ring-primary-500/20 outline-none shadow-sm" />
                                ) : (
                                  `₹${(bill.taxAmount || 0).toFixed(2)}`
                                )}
                              </td>
                              <td className="px-6 py-4 text-right font-black text-slate-800">
                                {editingBillId === bill._id ? (
                                  <input type="number" step="0.01" value={editForm.totalAmount} onChange={e => setEditForm({...editForm, totalAmount: e.target.value})} className="border border-primary-200 rounded px-2 py-1.5 w-24 text-right text-sm font-bold bg-white focus:ring-2 focus:ring-primary-500/20 outline-none shadow-sm" />
                                ) : (
                                  `₹${bill.totalAmount.toFixed(2)}`
                                )}
                              </td>

                              <td className="px-6 py-4 text-right">
                                {editingBillId === bill._id ? (
                                  <div className="flex justify-end space-x-2">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingBillId(null); }} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-sm">Cancel</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleEditSave(bill._id); }} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm">Save</button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end space-x-1">
                                    {bill.imageUrl && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setViewImage(bill.imageUrl); }}
                                        className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                        title="View Invoice Document"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleEditClick(bill); }}
                                      className="p-2 text-slate-300 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-all"
                                      title="Edit Bill"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleDeleteBill(bill._id); }}
                                      disabled={deletingId === bill._id}
                                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                      title="Delete Bill"
                                    >
                                      {deletingId === bill._id ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                  </div>
                                )}
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
                                          {editingBillId === bill._id ? (
                                            (editForm.items || []).map((item, i) => (
                                              <tr key={i}>
                                                <td className="px-4 py-2.5">
                                                  <input type="text" value={item.productName || ''} onChange={(e) => handleItemChange(i, 'productName', e.target.value)} className="w-full border border-primary-200 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary-500/20" />
                                                </td>
                                                <td className="px-4 py-2.5">
                                                  <input type="text" value={item.hsnCode || ''} onChange={(e) => handleItemChange(i, 'hsnCode', e.target.value)} className="w-full border border-primary-200 rounded px-2 py-1 text-xs uppercase outline-none focus:ring-2 focus:ring-primary-500/20" />
                                                </td>
                                                <td className="px-4 py-2.5">
                                                  <input type="number" value={item.qty || ''} onChange={(e) => handleItemChange(i, 'qty', e.target.value)} className="w-full border border-primary-200 rounded px-2 py-1 text-xs text-center outline-none focus:ring-2 focus:ring-primary-500/20" />
                                                </td>
                                                <td className="px-4 py-2.5">
                                                  <input type="number" step="0.01" value={item.price || ''} onChange={(e) => handleItemChange(i, 'price', e.target.value)} className="w-full border border-primary-200 rounded px-2 py-1 text-xs text-right outline-none focus:ring-2 focus:ring-primary-500/20" />
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-bold text-slate-800">₹{Number(item.amount || 0).toFixed(2)}</td>
                                              </tr>
                                            ))
                                          ) : (
                                            bill.items?.map((item, i) => (
                                              <tr key={i}>
                                                <td className="px-4 py-2.5 font-medium text-slate-700">{item.productName}</td>
                                                <td className="px-4 py-2.5 text-slate-500 uppercase">{item.hsnCode || '-'}</td>
                                                <td className="px-4 py-2.5 text-center text-slate-600">{item.qty}</td>
                                                <td className="px-4 py-2.5 text-right text-slate-600">₹{item.price?.toFixed(2)}</td>
                                                <td className="px-4 py-2.5 text-right font-bold text-slate-800">₹{item.amount?.toFixed(2)}</td>
                                              </tr>
                                            ))
                                          )}
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
                  {!billLoading && <PaginationControls currentPage={billPage} totalPages={billTotalPages} onPageChange={setBillPage} />}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Image Modal */}
      {viewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Source Document Viewer</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Digital Archive</p>
                </div>
              </div>
              <button onClick={() => setViewImage(null)} className="p-2 bg-white hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition-colors shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-800/5 flex justify-center items-center p-4 min-h-[400px]">
              <img src={viewImage.startsWith('data:') ? viewImage : `${API_BASE.replace('/api', '')}${viewImage}`} alt="Invoice Scan" className="max-w-full max-h-[75vh] object-contain rounded-xl ring-1 ring-slate-200/50 shadow-md" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
