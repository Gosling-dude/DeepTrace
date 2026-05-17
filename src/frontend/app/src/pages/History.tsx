import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { imageApi } from '../api/client';
import { History as HistoryIcon, Trash2, ChevronLeft, ChevronRight, Loader2, FileImage } from 'lucide-react';
import type { PredictionHistoryItem } from '../types';

export default function HistoryPage() {
  const [predictions, setPredictions] = useState<PredictionHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 15;

  useEffect(() => {
    loadHistory();
  }, [page]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await imageApi.getHistory(page, perPage);
      setPredictions(res.predictions);
      setTotal(res.total);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this prediction?')) return;
    try {
      await imageApi.deletePrediction(id);
      toast.success('Prediction deleted');
      loadHistory();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <HistoryIcon size={28} /> Detection History
          </h1>
          <p className="text-gray-400">All your past image analysis results in one place.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="text-blue-400 animate-spin" />
            </div>
          ) : predictions.length === 0 ? (
            <div className="text-center py-20">
              <FileImage size={48} className="text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No predictions yet</p>
              <Link to="/analyze" className="btn-primary inline-flex items-center gap-2 text-sm">
                Analyze Your First Image
              </Link>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">File</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Verdict</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Confidence</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Latency</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((pred) => (
                      <tr key={pred.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <Link to={`/results/${pred.id}`} className="text-sm text-white hover:text-blue-400 transition-colors truncate max-w-[200px] block">
                            {pred.original_filename}
                          </Link>
                          <span className="text-xs text-gray-600">{(pred.file_size_bytes / 1024).toFixed(0)} KB</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                            ${pred.is_ai_generated ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pred.is_ai_generated ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                            {pred.is_ai_generated ? 'AI Generated' : 'Genuine'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-white font-mono">
                          {(pred.confidence * 100).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                          {pred.inference_ms}ms
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {new Date(pred.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(pred.id)}
                            className="p-2 text-gray-600 hover:text-rose-400 transition-colors"
                            title="Delete prediction"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                  <span className="text-sm text-gray-500">
                    Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
                    >
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
