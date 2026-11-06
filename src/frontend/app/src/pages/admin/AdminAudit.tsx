import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { adminApi } from '../../api/client';
import AdminTabs from '../../components/AdminTabs';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AuditLogEntry } from '../../types';

const actionColors: Record<string, string> = {
  register: 'text-real-400',
  login: 'text-gray-300',
  role_changed: 'text-amber-400',
  status_changed: 'text-amber-400',
  account_deleted: 'text-signal-400',
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
    <div className="min-h-dvh pt-24 pb-20 px-5 sm:px-8">
      <div className="max-w-5xl mx-auto">
        <AdminTabs />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
          <h1 className="page-title mb-2">Audit log</h1>
          <p className="text-gray-400">Security-sensitive actions and admin activity.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="panel">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="text-bone-mute animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400">No audit entries yet.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-500">Action</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-500">Resource</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-500">Details</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-500">IP</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-500">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-line hover:bg-bone/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <span className={`text-xs font-mono ${actionColors[log.action] || actionColors.default}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {log.resource_type || '—'}
                          {log.resource_id && <span className="text-gray-500 ml-1 font-mono text-xs">({log.resource_id.slice(0, 8)})</span>}
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
                <div className="flex items-center justify-between px-6 py-4 border-t border-line">
                  <span className="text-sm text-gray-500">{total} total entries</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 text-gray-400 hover:text-bone disabled:text-gray-700 transition-colors">
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-gray-400">Page {page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 text-gray-400 hover:text-bone disabled:text-gray-700 transition-colors">
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
