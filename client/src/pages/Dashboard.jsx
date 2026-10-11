import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Key,
  Lock,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import api from '../api/axios';
import { SecretCard } from '../components/SecretCard';
import { SecretModal } from '../components/SecretModal';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { user } = useAuth();
  const [secrets, setSecrets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnv, setSelectedEnv] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [secretToEdit, setSecretToEdit] = useState(null);

  const fetchSecrets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/secrets');
      setSecrets(res.data);
    } catch (err) {
      console.error('Failed to fetch secrets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecrets();
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete secret '${name}'? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/secrets/${id}`);
      fetchSecrets();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete secret');
    }
  };

  const handleEdit = (secret) => {
    setSecretToEdit(secret);
    setModalOpen(true);
  };

  const handleOpenCreate = () => {
    setSecretToEdit(null);
    setModalOpen(true);
  };

  // Filter secrets
  const filteredSecrets = secrets.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.secret_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEnv = selectedEnv === 'ALL' || s.environment === selectedEnv;
    const matchesType = selectedType === 'ALL' || s.secret_type === selectedType;
    return matchesSearch && matchesEnv && matchesType;
  });

  const totalCount = secrets.length;
  const expiredCount = secrets.filter((s) => s.is_expired).length;
  const activeCount = totalCount - expiredCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Encrypted Credentials</p>
            <h2 className="text-2xl font-bold text-white mt-1">{totalCount}</h2>
            <p className="text-[11px] text-blue-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Protected via AES-256-GCM
            </p>
          </div>
          <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Key className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Active & Valid Keys</p>
            <h2 className="text-2xl font-bold text-emerald-400 mt-1">{activeCount}</h2>
            <p className="text-[11px] text-slate-400 mt-1">Ready for developer consumption</p>
          </div>
          <div className="p-3 bg-emerald-600/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Expired Secrets</p>
            <h2 className="text-2xl font-bold text-red-400 mt-1">{expiredCount}</h2>
            <p className="text-[11px] text-red-400/80 mt-1 flex items-center gap-1">
              {expiredCount > 0 ? (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  Key rotation advised
                </>
              ) : (
                'All credentials in compliance'
              )}
            </p>
          </div>
          <div className="p-3 bg-red-600/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters, Add Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search secrets by name or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          {/* Environment Filter */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
            {['ALL', 'PRODUCTION', 'STAGING', 'DEVELOPMENT'].map((env) => (
              <button
                key={env}
                onClick={() => setSelectedEnv(env)}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  selectedEnv === env
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {env === 'ALL' ? 'All Envs' : env}
              </button>
            ))}
          </div>

          {/* Secret Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Secret Types</option>
            <option value="API_KEY">API Keys</option>
            <option value="DB_PASSWORD">Database Passwords</option>
            <option value="ACCESS_TOKEN">Access Tokens</option>
            <option value="SSH_KEY">SSH Keys</option>
            <option value="ENV_VAR">Env Variables</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSecrets}
            title="Refresh Secrets"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Secret</span>
          </button>
        </div>
      </div>

      {/* Secrets Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-2" />
          <p className="text-sm">Fetching and decrypting credential metadata...</p>
        </div>
      ) : filteredSecrets.length === 0 ? (
        <div className="py-20 text-center bg-slate-900/40 border border-slate-800/60 rounded-2xl p-8">
          <div className="p-3 bg-slate-800/60 rounded-full inline-block text-slate-400 mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">No Secrets Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            {searchQuery || selectedEnv !== 'ALL' || selectedType !== 'ALL'
              ? 'No secrets matched your current filter criteria.'
              : 'Your vault is empty. Store an API key or password to get started.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Create First Secret
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSecrets.map((secret) => (
            <SecretCard
              key={secret.id}
              secret={secret}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Secret Create / Edit Modal */}
      <SecretModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        secretToEdit={secretToEdit}
        onSaved={fetchSecrets}
      />
    </div>
  );
};
