import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { adminApi } from '../../api/client';
import { BarChart3, Users, Upload, Shield, TrendingUp, Clock, AlertCircle, Activity } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { PlatformStats, AnalyticsTrends } from '../../types';

const COLORS = ['#f43f5e', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrends | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [s, t] = await Promise.all([adminApi.getStats(), adminApi.getTrends(30)]);
      setStats(s);
      setTrends(t);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pieData = [
    { name: 'AI Generated', value: stats.ai_detected_count },
    { name: 'Genuine', value: stats.real_detected_count },
  ];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <BarChart3 size={28} className="text-amber-400" /> Admin Analytics
          </h1>
          <p className="text-gray-400">Platform-wide metrics and insights.</p>
        </motion.div>

        {/* Stat Cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Users', value: stats.total_users, icon: Users, color: '#3b82f6' },
            { label: 'Active Today', value: stats.active_users_today, icon: Activity, color: '#10b981' },
            { label: 'Total Predictions', value: stats.total_predictions, icon: Shield, color: '#8b5cf6' },
            { label: 'Avg. Latency', value: `${stats.avg_inference_ms.toFixed(0)}ms`, icon: Clock, color: '#f59e0b' },
            { label: 'Weekly Active', value: stats.active_users_week, icon: TrendingUp, color: '#06b6d4' },
            { label: 'Monthly Active', value: stats.active_users_month, icon: Users, color: '#ec4899' },
            { label: 'Total Uploads', value: stats.total_uploads, icon: Upload, color: '#14b8a6' },
            { label: 'Error Rate', value: `${(stats.error_rate * 100).toFixed(1)}%`, icon: AlertCircle, color: '#f43f5e' },
          ].map((stat, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-center gap-2 mb-3">
                <stat.icon size={16} style={{ color: stat.color }} />
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </div>
          ))}
        </motion.div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Predictions Trend */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Daily Predictions (30d)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trends?.daily_predictions || []}>
                <defs>
                  <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#predGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* AI vs Real Trend */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">AI vs Real Detections</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trends?.ai_vs_real_trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="ai" name="AI Generated" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="real" name="Genuine" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Confidence Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Confidence Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trends?.confidence_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Detection Ratio */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Detection Ratio</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2 text-xs"><span className="w-3 h-3 rounded-full bg-rose-500" /> AI ({stats.ai_detected_count})</div>
              <div className="flex items-center gap-2 text-xs"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Real ({stats.real_detected_count})</div>
            </div>
          </motion.div>

          {/* Signups Trend */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Daily Signups (30d)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trends?.daily_signups || []}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#10b981" fill="url(#signupGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Avg Confidence */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Model Performance Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text mb-1">{(stats.avg_confidence * 100).toFixed(1)}%</div>
              <div className="text-xs text-gray-500 uppercase">Avg. Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">{stats.avg_inference_ms.toFixed(0)}ms</div>
              <div className="text-xs text-gray-500 uppercase">Avg. Latency</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">{stats.total_predictions}</div>
              <div className="text-xs text-gray-500 uppercase">Total Inferences</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
