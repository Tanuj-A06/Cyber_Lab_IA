import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Clock,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Lock,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import api from '../api/axios';

export const SecretCard = ({ secret, onEdit, onDelete }) => {
  const [revealedValue, setRevealedValue] = useState(null);
  const [loadingReveal, setLoadingReveal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 15-second auto-remasking timer to prevent shoulder surfing
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setRevealedValue(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleToggleReveal = async () => {
    if (revealedValue) {
      // Re-mask immediately
      setRevealedValue(null);
      setCountdown(0);
      return;
    }

    try {
      setLoadingReveal(true);
      const res = await api.get(`/secrets/${secret.id}/reveal`);
      setRevealedValue(res.data.decrypted_value);
      setCountdown(res.data.auto_remask_seconds || 15);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to decrypt secret');
    } finally {
      setLoadingReveal(false);
    }
  };

  const handleCopy = () => {
    if (!revealedValue) return;
    navigator.clipboard.writeText(revealedValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getEnvBadgeColor = (env) => {
    switch (env) {
      case 'PRODUCTION':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'STAGING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div
      className={`rounded-xl border bg-slate-900/60 backdrop-blur p-5 transition duration-200 hover:border-slate-700 ${
        secret.is_expired ? 'border-red-900/50 shadow-sm shadow-red-950' : 'border-slate-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-100 text-base">{secret.name}</h3>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${getEnvBadgeColor(
                secret.environment
              )}`}
            >
              {secret.environment}
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {secret.secret_type}
            </span>
          </div>
          {secret.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{secret.description}</p>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(secret)}
            title="Rotate / Edit Secret"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(secret.id, secret.name)}
            title="Delete Secret"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Secret Display Box */}
      <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-800/80 my-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <code className="text-sm font-mono tracking-wider truncate text-slate-200">
              {revealedValue ? revealedValue : secret.masked_preview}
            </code>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {revealedValue && (
              <button
                onClick={handleCopy}
                title="Copy Plaintext to Clipboard"
                className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={handleToggleReveal}
              disabled={loadingReveal}
              title={revealedValue ? 'Hide Secret' : 'Reveal Secret (Logs Audit Event)'}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                revealedValue
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20'
              }`}
            >
              {loadingReveal ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : revealedValue ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hide</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Reveal</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 15-second countdown progress bar */}
        {revealedValue && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between text-[11px] text-amber-400 mb-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Decrypted via AES-256-GCM (Audit logged)
              </span>
              <span className="font-mono font-semibold">Auto-remask in {countdown}s</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 15) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer / Expiration alerts */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
        {secret.is_expired ? (
          <div className="flex items-center gap-1.5 text-red-400 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>EXPIRED (Key Invalidation Alert)</span>
          </div>
        ) : secret.expires_at ? (
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            <span>Expires: {new Date(secret.expires_at).toLocaleDateString()}</span>
          </div>
        ) : (
          <span className="text-slate-500 text-[11px]">No Expiration Configured</span>
        )}

        <span className="text-slate-500 text-[11px]">
          Updated: {new Date(secret.updated_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};
