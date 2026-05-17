import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { imageApi } from '../api/client';
import { Upload, History, TrendingUp, Clock, Shield, ArrowRight } from 'lucide-react';
import type { PredictionHistoryItem } from '../types';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [recent, setRecent] = useState<PredictionHistoryItem[]>([]);
  const [totalPredictions, setTotalPredictions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentPredictions();
  }, []);

  const loadRecentPredictions = async () => {
    try {
      const res = await imageApi.getHistory(1, 5);
      setRecent(res.predictions);
      setTotalPredictions(res.total);
    } catch {
      // No predictions yet
    } finally {
      setLoading(false);
    }
  };

  const aiCount = recent.filter(p => p.is_ai_generated).length;
  const realCount = recent.length - aiCount;
  const avgConf = recent.length > 0
    ? (recent.reduce((sum, p) => sum + p.confidence, 0) / recent.length * 100).toFixed(0)
    : '—';

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, <span className="gradient-text">{user?.full_name?.split(' ')[0]}</span>
          </h1>
          <p className="text-gray-400">Here's an overview of your detection activity.</p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
                <Shield size={18} className="text-blue-400" />
              </div>
              <span className="text-sm text-gray-400">Total Scans</span>
            </div>
            <div className="text-3xl font-bold text-white">{totalPredictions}</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-500/10 border border-rose-500/20">
                <TrendingUp size={18} className="text-rose-400" />
              </div>
              <span className="text-sm text-gray-400">AI Detected</span>
            </div>
            <div className="text-3xl font-bold text-white">{aiCount}</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                <Shield size={18} className="text-emerald-400" />
              </div>
              <span className="text-sm text-gray-400">Genuine</span>
            </div>
            <div className="text-3xl font-bold text-white">{realCount}</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 border border-violet-500/20">
                <Clock size={18} className="text-violet-400" />
              </div>
              <span className="text-sm text-gray-400">Avg. Confidence</span>
            </div>
            <div className="text-3xl font-bold text-white">{avgConf}%</div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
        >
          <Link to="/analyze" className="glass-card glass-card-hover p-6 flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
              <Upload size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">Analyze New Image</h3>
              <p className="text-sm text-gray-400">Upload an image to check if it's AI-generated</p>
            </div>
            <ArrowRight size={18} className="text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>

          <Link to="/history" className="glass-card glass-card-hover p-6 flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-cyan-500/10 border border-cyan-500/20">
              <History size={22} className="text-cyan-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">View History</h3>
              <p className="text-sm text-gray-400">Browse your past detection results</p>
            </div>
            <ArrowRight size={18} className="text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">Recent Detections</h2>
            {totalPredictions > 5 && (
              <Link to="/history" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-12">
              <Upload size={40} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">No detections yet</p>
              <Link to="/analyze" className="btn-primary inline-flex items-center gap-2 text-sm">
                Analyze Your First Image <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((pred) => (
                <Link
                  key={pred.id}
                  to={`/results/${pred.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-colors group"
                >
                  <div className={`w-3 h-3 rounded-full shrink-0 ${pred.is_ai_generated ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{pred.original_filename}</p>
                    <p className="text-xs text-gray-500">{new Date(pred.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <span className={`text-sm font-semibold ${pred.is_ai_generated ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {pred.is_ai_generated ? 'AI Generated' : 'Genuine'}
                  </span>
                  <span className="text-sm text-gray-400 font-mono">{(pred.confidence * 100).toFixed(0)}%</span>
                  <ArrowRight size={14} className="text-gray-600 group-hover:text-gray-300 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
