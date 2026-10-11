import React, { useState, useEffect } from 'react';
import { X, Lock, Key, Shield, Sparkles, Calendar, FileText } from 'lucide-react';
import api from '../api/axios';

export const SecretModal = ({ isOpen, onClose, secretToEdit, onSaved }) => {
  const [formData, setFormData] = useState({
    name: '',
    secret_type: 'API_KEY',
    environment: 'DEVELOPMENT',
    secret_value: '',
    description: '',
    expires_at: '',
  });
  const [showPlaintext, setShowPlaintext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (secretToEdit) {
      setFormData({
        name: secretToEdit.name || '',
        secret_type: secretToEdit.secret_type || 'API_KEY',
        environment: secretToEdit.environment || 'DEVELOPMENT',
        secret_value: '', // leave empty unless rotating
        description: secretToEdit.description || '',
        expires_at: secretToEdit.expires_at ? secretToEdit.expires_at.slice(0, 16) : '',
      });
    } else {
      setFormData({
        name: '',
        secret_type: 'API_KEY',
        environment: 'DEVELOPMENT',
        secret_value: '',
        description: '',
        expires_at: '',
      });
    }
    setError(null);
  }, [secretToEdit, isOpen]);

  if (!isOpen) return null;

  const generateSecureKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~|}{[]';
    let result = '';
    const randomValues = new Uint32Array(32);
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < 32; i++) {
      result += chars[randomValues[i] % chars.length];
    }
    setFormData((prev) => ({ ...prev, secret_value: result }));
    setShowPlaintext(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        secret_type: formData.secret_type,
        environment: formData.environment,
        description: formData.description || null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      };

      if (!secretToEdit) {
        if (!formData.secret_value) {
          throw new Error('Secret value is required');
        }
        payload.secret_value = formData.secret_value;
        await api.post('/secrets', payload);
      } else {
        if (formData.secret_value) {
          payload.secret_value = formData.secret_value; // rotate secret
        }
        await api.put(`/secrets/${secretToEdit.id}`, payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-400">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-lg text-white">
              {secretToEdit ? 'Rotate / Update Secret' : 'Add New Encrypted Secret'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-lg text-red-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Secret Label / Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Stripe Production Key, Primary DB Pass"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Secret Type</label>
              <select
                value={formData.secret_type}
                onChange={(e) => setFormData({ ...formData, secret_type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="API_KEY">API Key</option>
                <option value="DB_PASSWORD">Database Password</option>
                <option value="ACCESS_TOKEN">Access / JWT Token</option>
                <option value="SSH_KEY">SSH / Private Key</option>
                <option value="ENV_VAR">Environment Secret</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Environment</label>
              <select
                value={formData.environment}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="DEVELOPMENT">Development</option>
                <option value="STAGING">Staging</option>
                <option value="PRODUCTION">Production</option>
              </select>
            </div>
          </div>

          {/* Secret Value field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">
                {secretToEdit ? 'New Value (Leave blank to keep existing)' : 'Secret Plaintext Value *'}
              </label>
              <button
                type="button"
                onClick={generateSecureKey}
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition"
              >
                <Sparkles className="w-3 h-3" />
                Generate High-Entropy Key
              </button>
            </div>
            <div className="relative">
              <input
                type={showPlaintext ? 'text' : 'password'}
                required={!secretToEdit}
                placeholder={secretToEdit ? 'Enter new value to rotate key...' : 'sk_live_... / database_pwd'}
                value={formData.secret_value}
                onChange={(e) => setFormData({ ...formData, secret_value: e.target.value })}
                className="w-full px-3 py-2 pr-16 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPlaintext(!showPlaintext)}
                className="absolute right-2 top-2 text-xs text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-800"
              >
                {showPlaintext ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Encrypted at rest using AES-256-GCM with a fresh 12-byte IV nonce.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Expiration Date (Optional)</label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Notes / Description</label>
              <input
                type="text"
                placeholder="Optional purpose notes"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
            >
              {submitting ? 'Encrypting & Saving...' : secretToEdit ? 'Save Changes' : 'Encrypt & Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
