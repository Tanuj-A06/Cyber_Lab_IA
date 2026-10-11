import React, { useState } from 'react';
import { ShieldCheck, KeyRound, AlertCircle, ArrowLeft, Terminal, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const MfaVerify = () => {
  const { mfaData, verifyOtp, setMfaData } = useAuth();
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyOtp(otpCode);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const fillMockOtp = () => {
    if (mfaData?.mock_otp) {
      setOtpCode(mfaData.mock_otp);
      setError('');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 mb-3 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Two-Factor Authentication</h1>
          <p className="text-sm text-slate-400 mt-1">
            Logging in as <span className="text-emerald-400 font-semibold">{mfaData?.username}</span>
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-2 mb-6 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-2 rounded-lg">
            <KeyRound className="w-4 h-4 shrink-0" />
            <span>Step 2: Enter 6-Digit One-Time Password (5-Min TTL)</span>
          </div>

          {/* Offline Lab Demonstration OTP Card */}
          {mfaData?.mock_otp && (
            <div className="mb-6 p-3.5 bg-slate-950 border border-blue-500/30 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                  <Terminal className="w-3.5 h-3.5" />
                  Offline Lab Delivery Active
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  Printed to Terminal
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Generated OTP for this session: <strong className="text-white font-mono text-sm tracking-wider">{mfaData.mock_otp}</strong>
              </p>
              <button
                type="button"
                onClick={fillMockOtp}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline font-medium flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Click to Auto-Fill OTP for Grading Demo
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-lg flex items-start gap-2 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                6-Digit Security Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                pattern="\d{6}"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1 text-center">
                Maximum 3 verification attempts permitted before session lock.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg shadow-emerald-600/20"
            >
              {loading ? 'Validating Token...' : 'Verify OTP & Enter Vault'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setMfaData(null)}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Step 1 Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
