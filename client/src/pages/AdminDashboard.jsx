import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Key,
  FileText,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Terminal,
} from 'lucide-react';
import api from '../api/axios';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, logsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/audit-logs', {
          params: {
            action: actionFilter || undefined,
            user_identifier: userFilter || undefined,
            limit: 100,
          },
        }),
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data);
      setAuditLogs(logsRes.data);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [actionFilter, userFilter]);

  const handleToggleUserStatus = async (userId, username, currentStatus) => {
    const actionName = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionName} user '${username}'?`)) {
      return;
    }

    try {
      await api.patch(`/admin/users/${userId}/toggle-status`);
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update user status');
    }
  };

  const getActionBadge = (action) => {
    if (action.includes('FAILED') || action.includes('LOCKED') || action.includes('DELETED')) {
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
    if (action.includes('REVEALED') || action.includes('DEACTIVATED') || action.includes('UPDATED')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Overview Stats */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-purple-400" />
              Security Oversight & Incident Management
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Role-Based Access Control Audit Center (Admin Level)
            </p>
          </div>
          <button
            onClick={fetchAdminData}
            title="Refresh Audit Logs"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Total Users</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats?.total_users ?? 0}</h3>
            </div>
            <div className="p-3 bg-purple-600/10 border border-purple-500/20 rounded-xl text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Stored Secrets</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats?.total_secrets ?? 0}</h3>
            </div>
            <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400">
              <Key className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Expired Secrets</p>
              <h3 className="text-2xl font-bold text-red-400 mt-1">{stats?.expired_secrets ?? 0}</h3>
            </div>
            <div className="p-3 bg-red-600/10 border border-red-500/20 rounded-xl text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Audit Logs Recorded</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                {stats?.total_audit_events ?? 0}
              </h3>
            </div>
            <div className="p-3 bg-emerald-600/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          Registered Users & RBAC Roles
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Username</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Created At</th>
                <th className="py-2.5 px-3 text-right">Access Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-2.5 px-3 font-medium text-white">{u.username}</td>
                  <td className="py-2.5 px-3 text-slate-400">{u.email}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-400">
                        <XCircle className="w-3.5 h-3.5" />
                        Deactivated
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {u.role !== 'ADMIN' && (
                      <button
                        onClick={() => handleToggleUserStatus(u.id, u.username, u.is_active)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                          u.is_active
                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Audit Trail Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Append-Only Security Audit Trail
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tracks unmaskings, logins, MFA attempts, and credential lifecycles with client IPs
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-purple-500"
            >
              <option value="">All Security Actions</option>
              <option value="SECRET_REVEALED">SECRET_REVEALED</option>
              <option value="SECRET_CREATED">SECRET_CREATED</option>
              <option value="SECRET_UPDATED">SECRET_UPDATED</option>
              <option value="SECRET_DELETED">SECRET_DELETED</option>
              <option value="USER_LOGIN_SUCCESS">USER_LOGIN_SUCCESS</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
              <option value="MFA_FAILED">MFA_FAILED</option>
              <option value="USER_LOGOUT">USER_LOGOUT</option>
            </select>

            <input
              type="text"
              placeholder="Filter by user..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-purple-500 w-32"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 sticky top-0 backdrop-blur z-10">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">User / Actor</th>
                <th className="py-2.5 px-3">Action Event</th>
                <th className="py-2.5 px-3">Client IP Address</th>
                <th className="py-2.5 px-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-200">
                      {log.user_identifier}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {log.ip_address}
                    </td>
                    <td className="py-2 px-3 text-slate-300 max-w-xs truncate" title={log.details}>
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
