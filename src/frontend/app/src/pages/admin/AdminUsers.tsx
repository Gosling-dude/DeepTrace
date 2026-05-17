import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/client';
import { Users, Search, Shield, ShieldOff, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { UserListItem } from '../../types';

export default function AdminUsers() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const perPage = 20;

  useEffect(() => {
    loadUsers();
  }, [page, search]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers(page, perPage, search || undefined);
      setUsers(res.users);
      setTotal(res.total);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await adminApi.updateRole(userId, newRole);
      toast.success(`Role updated to ${newRole}`);
      loadUsers();
    } catch (error: any) {
      toast.error(error.detail || 'Failed to update role');
    }
  };

  const handleStatusToggle = async (userId: string, currentActive: boolean) => {
    try {
      await adminApi.updateStatus(userId, !currentActive);
      toast.success(currentActive ? 'User deactivated' : 'User activated');
      loadUsers();
    } catch (error: any) {
      toast.error(error.detail || 'Failed to update status');
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users size={28} className="text-amber-400" /> User Management
          </h1>
          <p className="text-gray-400">Manage user accounts, roles, and access.</p>
        </motion.div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or email..."
              className="input-field pl-10"
            />
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="text-blue-400 animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Active</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: u.role === 'admin' ? 'linear-gradient(135deg, #f59e0b, #f43f5e)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                              {u.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{u.full_name}</div>
                              <div className="text-xs text-gray-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                            ${u.role === 'admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}
                          >
                            <Shield size={10} /> {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs ${u.is_active ? 'text-emerald-400' : 'text-gray-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {u.last_login ? new Date(u.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRoleChange(u.id, u.role === 'admin' ? 'user' : 'admin')}
                              className="p-2 text-gray-500 hover:text-amber-400 transition-colors"
                              title={`Make ${u.role === 'admin' ? 'user' : 'admin'}`}
                            >
                              <Shield size={14} />
                            </button>
                            <button
                              onClick={() => handleStatusToggle(u.id, u.is_active)}
                              className={`p-2 transition-colors ${u.is_active ? 'text-gray-500 hover:text-rose-400' : 'text-gray-500 hover:text-emerald-400'}`}
                              title={u.is_active ? 'Deactivate' : 'Activate'}
                            >
                              <ShieldOff size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                  <span className="text-sm text-gray-500">
                    {total} total users
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 text-gray-400 hover:text-white disabled:text-gray-700 transition-colors">
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-gray-400">Page {page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 text-gray-400 hover:text-white disabled:text-gray-700 transition-colors">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
