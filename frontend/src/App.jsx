import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { FileText, LayoutDashboard, LogOut } from 'lucide-react';
import UploadPanel from './pages/UploadPanel';
import DashboardPanel from './pages/DashboardPanel';
import Login from './pages/Login';

// Layout built specifically for the dashboard side
function AdminLayout({ children }) {
  const handleLogout = () => {
    localStorage.removeItem('dashboardToken');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center">
          <FileText className="text-primary-600 w-8 h-8 mr-3" />
          <h1 className="text-xl font-bold text-slate-800">BillScanner <span className="text-primary-500 font-extrabold">Admin</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm font-semibold text-slate-500 hover:text-primary-600 px-4 py-2 transition-colors">Go to Upload App</Link>
          <button onClick={handleLogout} className="flex items-center bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-500 px-4 py-2 rounded-lg text-sm font-bold transition-all">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden w-full">
        {children}
      </main>
    </div>
  );
}

// Layout built for the public upload app
function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      <header className="px-8 py-6 flex justify-between items-center max-w-7xl mx-auto w-full z-10 transition-all">
        <div className="flex items-center">
          <FileText className="text-primary-600 w-8 h-8 mr-3" />
          <h1 className="text-xl font-black text-slate-800 tracking-tight">BillScanner <span className="text-primary-600">App</span></h1>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full z-10">
        {children}
      </main>
    </div>
  );
}

// Protected Route Guard
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('dashboardToken');
  if (!token) return <Navigate to="/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ className: 'font-sans font-bold text-sm shadow-xl rounded-2xl border border-slate-100' }} />
      <Router>
        <Routes>
          <Route path="/" element={<PublicLayout><UploadPanel /></PublicLayout>} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPanel /></ProtectedRoute>} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
