import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { MfaVerify } from './pages/MfaVerify';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { RefreshCw, Shield } from 'lucide-react';

const AppContent = () => {
  const { user, token, loading, mfaData } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [activeTab, setActiveTab] = useState('secrets'); // 'secrets' | 'admin'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className="text-sm">Initializing Secure Session...</p>
      </div>
    );
  }

  // Unauthenticated states
  if (!token) {
    if (mfaData) {
      return (
        <div className="min-h-screen bg-slate-950">
          <MfaVerify />
        </div>
      );
    }

    if (authView === 'register') {
      return (
        <div className="min-h-screen bg-slate-950">
          <Register onNavigateToLogin={() => setAuthView('login')} />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950">
        <Login onNavigateToRegister={() => setAuthView('register')} />
      </div>
    );
  }

  // Authenticated state
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1">
        {activeTab === 'admin' && user?.role === 'ADMIN' ? (
          <AdminDashboard />
        ) : (
          <Dashboard />
        )}
      </main>

      {/* Cyber Security Assessment Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Shield className="w-4 h-4 text-blue-400" />
            Cyber Security Lab Assessment — Secure API Key & Secret Manager
          </span>
          <span className="text-[11px] text-slate-500">
            Mechanisms: AES-256-GCM • Bcrypt • OTP MFA • RBAC • JWT Blacklist • SlowAPI • Audit Trails
          </span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
