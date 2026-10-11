import React, { useState } from 'react';
import { Shield, Lock, User, ArrowRight, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login = ({ onNavigateToRegister }) => {
  const { loginStep1 } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginStep1(username, password);
      // AuthContext sets mfaData, triggering MfaVerify screen
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Rate limit exceeded: Too many failed login attempts. Please wait 1 minute.');
      } else {
        setError(err.response?.data?.detail || 'Authentication failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 mb-3 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cyber Security Secret Vault</h1>
          <p className="text-sm text-slate-400 mt-1">
            Zero-Knowledge Architecture with AES-256 & OTP MFA
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-2 mb-6 text-xs text-blue-400 bg-blue-950/40 border border-blue-800/40 px-3 py-2 rounded-lg">
            <KeyRound className="w-4 h-4 shrink-0" />
            <span>Step 1: Password Verification (Bcrypt Hashing)</span>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-lg flex items-start gap-2 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Username</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="admin_sec or dev_tanuj"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg shadow-blue-600/20"
            >
              {loading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <span>Proceed to MFA (OTP)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-Fill Accounts */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 text-center">
              Internal Assessment Quick-Fill Accounts
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin_sec', 'AdminSecure@2026')}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition"
              >
                <div className="font-medium text-purple-400">Admin Account</div>
                <div className="text-[10px] text-slate-400">admin_sec</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('dev_tanuj', 'DevSecure@2026')}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition"
              >
                <div className="font-medium text-emerald-400">Developer Account</div>
                <div className="text-[10px] text-slate-400">dev_tanuj</div>
              </button>
            </div>
          </div>

          {/* Switch to Register */}
          <div className="mt-6 text-center text-xs text-slate-400">
            <span>Need a new account? </span>
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="text-blue-400 hover:underline font-medium"
            >
              Register here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
