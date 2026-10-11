import React from 'react';
import { Shield, Key, FileText, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-lg text-blue-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-lg tracking-tight">KeyVault</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 tracking-wider">
                AES-256-GCM
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Secure API Key & Secret Management System</p>
          </div>
        </div>

        {/* Navigation & User Info */}
        <div className="flex items-center gap-3 sm:gap-6">
          {user && (
            <nav className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setActiveTab('secrets')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                  activeTab === 'secrets'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>Secrets</span>
              </button>

              {user.role === 'ADMIN' && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                    activeTab === 'admin'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Audit & Oversight</span>
                </button>
              )}
            </nav>
          )}

          {/* User Profile Badge */}
          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-medium text-slate-200">{user.username}</span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    user.role === 'ADMIN' ? 'text-purple-400' : 'text-emerald-400'
                  }`}
                >
                  {user.role}
                </span>
              </div>

              <button
                onClick={logout}
                title="Logout (Revoke Session Token)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-slate-800 hover:bg-red-950/60 border border-slate-700 hover:border-red-500/40 text-slate-300 hover:text-red-400 transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
