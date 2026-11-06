import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { adminApi } from '../../api/client';
import AdminTabs from '../../components/AdminTabs';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { PlatformStats, AnalyticsTrends } from '../../types';

const COLORS = ['var(--signal)', 'var(--real)', 'var(--bone)', 'var(--bone-dim)', 'var(--warn)'];

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
      <div className="min-h-dvh pt-24 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const pieData = [
    { name: 'AI-generated', value: stats.ai_detected_count },
    { name: 'Genuine', value: stats.real_detected_count },
  ];

  return (
    <div className="min-h-dvh pt-24 pb-20 px-5 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <AdminTabs />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
          <h1 className="page-title mb-2">Analytics</h1>
          <p className="text-gray-400">Platform-wide metrics and insights.</p>
        </motion.div>

        {/* Stat Cards */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total users', value: stats.total_users },
            { label: 'Active today', value: stats.active_users_today },
            { label: 'Total predictions', value: stats.total_predictions },
            { label: 'Average latency', value: `${stats.avg_inference_ms.toFixed(0)} ms` },
            { label: 'Active this week', value: stats.active_users_week },
            { label: 'Active this month', value: stats.active_users_month },
            { label: 'Total uploads', value: stats.total_uploads },
            { label: 'Error rate', value: `${(stats.error_rate * 100).toFixed(1)}%` },
          ].map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="label">{stat.label}</div>
              <div className="num text-2xl text-bone mt-2">{stat.value}</div>
            </div>
          ))}
        </motion.div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Predictions Trend */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="panel p-6">
            <h3 className="heading text-base text-bone mb-4">Predictions per day, last 30 days</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trends?.daily_predictions || []}>
                <defs>
                  <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--bone)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--bone)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--bone-mute)' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--bone-mute)' }} />
                <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', color: 'var(--bone)', borderRadius: 4, fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="var(--bone)" fill="url(#predGrad)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* AI vs Real Trend */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="panel p-6">
            <h3 className="heading text-base text-bone mb-4">AI-generated vs genuine</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trends?.ai_vs_real_trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--bone-mute)' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--bone-mute)' }} />
                <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', color: 'var(--bone)', borderRadius: 4, fontSize: 12 }} />
                <Bar dataKey="ai" name="AI-generated" fill="var(--signal)" radius={[1, 1, 0, 0]} />
                <Bar dataKey="real" name="Genuine" fill="var(--real)" radius={[1, 1, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Confidence Distribution */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="panel p-6">
            <h3 className="heading text-base text-bone mb-4">Confidence distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trends?.confidence_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: 'var(--bone-mute)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--bone-mute)' }} />
                <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', color: 'var(--bone)', borderRadius: 4, fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--bone-dim)" radius={[1, 1, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Detection Ratio */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="panel p-6">
            <h3 className="heading text-base text-bone mb-4">Verdict ratio</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none" dataKey="value">
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', color: 'var(--bone)', borderRadius: 4, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2 text-xs"><span className="w-2.5 h-2.5 rounded-sm bg-signal-500" /> AI ({stats.ai_detected_count})</div>
              <div className="flex items-center gap-2 text-xs"><span className="w-2.5 h-2.5 rounded-sm bg-real-400" /> Real ({stats.real_detected_count})</div>
            </div>
          </motion.div>

          {/* Signups Trend */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="panel p-6">
            <h3 className="heading text-base text-bone mb-4">Signups per day, last 30 days</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trends?.daily_signups || []}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--bone)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--bone)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--bone-mute)' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--bone-mute)' }} />
                <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', color: 'var(--bone)', borderRadius: 4, fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="var(--bone)" fill="url(#signupGrad)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Avg Confidence */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="panel p-6">
          <h3 className="heading text-base text-bone mb-4">Model performance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <div className="num text-3xl text-bone mb-1">{(stats.avg_confidence * 100).toFixed(1)}%</div>
              <div className="label">Average confidence</div>
            </div>
            <div>
              <div className="num text-3xl text-bone mb-1">{stats.avg_inference_ms.toFixed(0)}ms</div>
              <div className="label">Average latency</div>
            </div>
            <div>
              <div className="num text-3xl text-bone mb-1">{stats.total_predictions}</div>
              <div className="label">Total inferences</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
