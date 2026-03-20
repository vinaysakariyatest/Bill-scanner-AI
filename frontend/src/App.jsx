import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Receipt, LayoutDashboard, LogOut } from 'lucide-react';
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
          <Receipt className="text-primary-600 w-8 h-8 mr-3" />
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
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

// Layout built for the public upload app
function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-primary-100/40 via-blue-50/20 to-transparent -z-10 blur-3xl rounded-b-[100px]" />
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-blue-200/30 -z-10 blur-[100px] rounded-full" />

      <header className="px-8 py-6 flex justify-between items-center max-w-7xl mx-auto w-full z-10">
        <div className="flex items-center">
          <Receipt className="text-primary-600 w-8 h-8 mr-3" />
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400">BillScanner App</h1>
        </div>
        <Link to="/login" className="flex items-center text-sm font-bold text-slate-500 hover:text-primary-600 bg-white px-5 py-2.5 rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <LayoutDashboard className="w-4 h-4 mr-2" />
          Admin Login
        </Link>
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
    <Router>
      <Routes>
        <Route path="/" element={<PublicLayout><UploadPanel /></PublicLayout>} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPanel /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
