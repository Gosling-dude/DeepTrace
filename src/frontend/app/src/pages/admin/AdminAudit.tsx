import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { adminApi } from '../../api/client';
import { ScrollText, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AuditLogEntry } from '../../types';

const actionColors: Record<string, string> = {
  register: 'text-emerald-400',
  login: 'text-blue-400',
  role_changed: 'text-amber-400',
  status_changed: 'text-orange-400',
  account_deleted: 'text-rose-400',
  default: 'text-gray-400',
};

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 30;

  useEffect(() => {
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLogs(page, perPage);
      setLogs(res.logs);
      setTotal(res.total);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <ScrollText size={28} className="text-amber-400" /> Audit Logs
          </h1>
          <p className="text-gray-400">Security-sensitive actions and admin activity.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="text-blue-400 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20">
              <ScrollText size={48} className="text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400">No audit logs yet</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Action</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Resource</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Details</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">IP</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <span className={`text-sm font-medium ${actionColors[log.action] || actionColors.default}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {log.resource_type || '—'}
                          {log.resource_id && <span className="text-gray-600 ml-1 font-mono text-xs">({log.resource_id.slice(0, 8)})</span>}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate">
                          {Object.keys(log.details).length > 0 ? JSON.stringify(log.details) : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                          {log.ip_address || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                  <span className="text-sm text-gray-500">{total} total entries</span>
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
