import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const API_BASE = '/api';

export default function UploadPanel() {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: '',
    vendorName: '',
    vendorGstNumber: '',
    customerName: '',
    customerMobileNumber: '',
    customerGstNumber: '',
    subTotal: '',
    taxAmount: '',
    discountAmount: '',
    totalAmount: '',
    items: []
  });

  // Auto-calculate grand total
  useEffect(() => {
    const sub = Number(formData.subTotal) || 0;
    const tax = Number(formData.taxAmount) || 0;
    const disc = Number(formData.discountAmount) || 0;
    // Grand Total = Subtotal + Tax - Discount
    const total = Number((sub + tax - disc).toFixed(2));

    if (total !== Number(formData.totalAmount)) {
      setFormData(prev => ({ ...prev, totalAmount: total }));
    }
  }, [formData.subTotal, formData.taxAmount, formData.discountAmount]);

  const itemsSum = formData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);
      setSuccess(false);
      setExtractedData(null);
      
      // Auto-upload
      processFile(selectedFile);
    }
  };

  const processFile = async (fileToUpload) => {
    setProcessing(true);
    setError(null);

    const data = new FormData();
    data.append('invoice', fileToUpload);

    try {
      const res = await axios.post(`${API_BASE}/upload`, data);
      setExtractedData(res.data);
      setFormData({
        invoiceNumber: res.data.invoiceNumber || '',
        invoiceDate: res.data.invoiceDate || '',
        vendorName: res.data.vendorName || '',
        vendorGstNumber: res.data.vendorGstNumber || '',
        customerName: res.data.customerName || '',
        customerMobileNumber: res.data.customerMobileNumber || '',
        customerGstNumber: res.data.customerGstNumber || '',
        subTotal: res.data.subTotal || 0,
        taxAmount: res.data.taxAmount || 0,
        discountAmount: res.data.discountAmount || 0,
        totalAmount: res.data.totalAmount || 0,
        items: res.data.items || []
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process invoice.');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpload = () => {
    if (file) processFile(file);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    const updatedItem = { ...newItems[index], [field]: value };

    // Auto-calculate row amount
    if (field === 'qty' || field === 'price') {
      updatedItem.amount = (Number(updatedItem.qty) || 0) * (Number(updatedItem.price) || 0);
    }

    newItems[index] = updatedItem;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productName: '', hsnCode: '', qty: 1, price: 0, amount: 0 }]
    }));
  };

  const removeItemRow = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);

    try {
      await axios.post(`${API_BASE}/bills`, formData);
      setSuccess(true);
      setExtractedData(null);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save bill.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full relative pb-10">
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Upload Bill</h2>
        <p className="text-slate-500 mt-2 text-sm max-w-2xl text-balance">
          Drag and drop an invoice image or PDF. Our AI scanner extracts detailed CA accounting fields instantly.
        </p>
      </div>

      {!extractedData ? (
        <div className="bg-white rounded-3xl p-10 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-primary-50/50">
            <Upload className="w-10 h-10 text-primary-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Select a file to upload</h3>
          <p className="text-slate-400 text-sm mb-8 text-center max-w-sm">Support for PDF, JPG, PNG files.</p>
          
          <label className="cursor-pointer bg-primary-600 hover:bg-primary-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-all shadow-lg flex items-center">
            Choose File
            <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileChange} />
          </label>
          
          {file && (
            <div className="mt-8 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={`flex items-center space-x-3 px-6 py-3 rounded-xl border mb-6 transition-all ${processing ? 'bg-primary-50 border-primary-100 ring-4 ring-primary-50' : 'bg-slate-50 border-slate-100'}`}>
                {processing ? <Loader2 className="w-5 h-5 text-primary-500 animate-spin" /> : <FileText className="w-5 h-5 text-slate-400" />}
                <span className={`text-sm font-medium max-w-xs truncate ${processing ? 'text-primary-700' : 'text-slate-700'}`}>
                  {processing ? 'AI is scanning your invoice...' : file.name}
                </span>
              </div>
              
              {processing && (
                <p className="text-xs font-bold text-primary-500 animate-pulse uppercase tracking-widest">Please wait a moment...</p>
              )}
            </div>
          )}

          {error && <div className="mt-6 w-full max-w-lg flex items-center bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100"><AlertCircle className="w-5 h-5 mr-3 shrink-0" />{error}</div>}
          {success && <div className="mt-6 w-full max-w-lg flex items-center bg-green-50 text-green-600 px-4 py-3 rounded-xl text-sm border border-green-100"><CheckCircle className="w-5 h-5 mr-3 shrink-0" />Bill successfully processed and saved to dashboard.</div>}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100 mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="bg-slate-50 border-b border-slate-100 px-8 py-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold flex items-center text-slate-800">
                <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
                Review Invoice Details
              </h3>
              <p className="text-sm text-slate-500 mt-1">Make necessary corrections for tax and totals before saving.</p>
            </div>
            <button type="button" onClick={() => setExtractedData(null)} className="text-sm font-bold text-slate-400 hover:text-slate-700 transition-colors">
              Cancel
            </button>
          </div>

          <div className="p-8">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4 border-b pb-2">General Info</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Invoice Number</label>
                <input type="text" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleFormChange} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm font-medium outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Invoice Date</label>
                <input type="text" placeholder="YYYY-MM-DD" name="invoiceDate" value={formData.invoiceDate} onChange={handleFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm font-medium outline-none transition-all" />
              </div>
            </div>

            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4 border-b pb-2">Parties</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-8">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Vendor / Supplier</label>
                <input type="text" name="vendorName" value={formData.vendorName} onChange={handleFormChange} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm font-medium outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Customer (Billed To)</label>
                <input type="text" name="customerName" value={formData.customerName} onChange={handleFormChange} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm font-medium outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Customer Mobile</label>
                <input type="text" name="customerMobileNumber" value={formData.customerMobileNumber} onChange={handleFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm font-medium outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Vendor GST Number</label>
                <input type="text" name="vendorGstNumber" value={formData.vendorGstNumber} onChange={handleFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm font-medium outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Customer GST Number</label>
                <input type="text" name="customerGstNumber" value={formData.customerGstNumber} onChange={handleFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm font-medium outline-none transition-all" />
              </div>
            </div>

            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4 border-b pb-2">Accounting Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-600">Subtotal</label>
                  {itemsSum > 0 && itemsSum !== Number(formData.subTotal) && (
                    <button 
                      type="button" 
                      onClick={() => setFormData(p => ({ ...p, subTotal: itemsSum }))}
                      className="text-[10px] text-primary-500 hover:underline font-bold"
                    >
                      Sync Items (₹{itemsSum})
                    </button>
                  )}
                </div>
                <input type="number" step="0.01" name="subTotal" value={formData.subTotal} onChange={handleFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm font-medium outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Total Tax Amount</label>
                <input type="number" step="0.01" name="taxAmount" value={formData.taxAmount} onChange={handleFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm font-medium outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Discount</label>
                <input type="number" step="0.01" name="discountAmount" value={formData.discountAmount} onChange={handleFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm font-medium outline-none transition-all" />
              </div>
              <div className="space-y-1 bg-primary-50/50 p-2 -m-2 rounded-xl border border-primary-50">
                <label className="text-xs font-bold text-primary-700 pl-2">Grand Total Amount</label>
                <input type="number" step="0.01" name="totalAmount" value={formData.totalAmount} onChange={handleFormChange} required className="w-full px-4 py-2.5 bg-white border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm font-black text-slate-900 outline-none transition-all shadow-inner" />
              </div>
            </div>

            <h4 className="flex items-center justify-between text-xs font-black uppercase text-slate-400 tracking-wider mb-4 border-b pb-2">
              <span>Line Items</span>
              <button type="button" onClick={addItemRow} className="text-primary-600 hover:text-primary-700 normal-case">+ Add Item</button>
            </h4>
            <div className="space-y-2 mb-8">
              {formData.items.length > 0 && (
                <div className="flex gap-2 items-end shrink-0 mb-2 px-1">
                  <div className="flex-1 min-w-[150px] text-xs font-semibold text-slate-500">Item Name</div>
                  <div className="w-24 text-xs font-semibold text-slate-500 uppercase">HSN/SAC</div>
                  <div className="w-20 text-xs font-semibold text-slate-500 uppercase">Qty</div>
                  <div className="w-24 text-xs font-semibold text-slate-500 uppercase">Rate</div>
                  <div className="w-28 text-xs font-semibold text-slate-500 uppercase">Amount</div>
                  <div className="w-9"></div>
                </div>
              )}
              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start shrink-0">
                  <input type="text" value={item.productName} onChange={(e) => handleItemChange(index, 'productName', e.target.value)} className="flex-1 min-w-[150px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Item Name" />
                  <input type="text" value={item.hsnCode} onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)} className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="HSN/SAC" />
                  <input type="number" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Qty" />
                  <input type="number" value={item.price} onChange={(e) => handleItemChange(index, 'price', e.target.value)} className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Rate" />
                  <input type="number" value={item.amount} onChange={(e) => handleItemChange(index, 'amount', e.target.value)} className="w-28 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold" placeholder="Subtotal" />
                  <button type="button" onClick={() => removeItemRow(index)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><AlertCircle className="w-5 h-5"/></button>
                </div>
              ))}
              {formData.items.length === 0 && <p className="text-sm text-slate-400 py-2">No items listed. Add an item or ignore if not needed.</p>}
            </div>

            {error && <div className="mb-6 w-full flex items-center bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100"><AlertCircle className="w-5 h-5 mr-3 shrink-0" />{error}</div>}

            <div className="flex justify-end pt-6 border-t border-slate-100">
              <button type="submit" disabled={processing} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-70 flex items-center">
                {processing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                Save Bill to Dashboard
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
