import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { imageApi } from '../api/client';
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
    ? `${(recent.reduce((sum, p) => sum + p.confidence, 0) / recent.length * 100).toFixed(0)}%`
    : '—';

  // The last three figures are computed from the most recent results only.
  const scope = recent.length > 0 ? `Last ${recent.length}` : 'No results yet';
  const stats = [
    { label: 'Images analyzed', value: totalPredictions, note: 'All time' },
    { label: 'Flagged as AI', value: aiCount, note: scope },
    { label: 'Genuine', value: realCount, note: scope },
    { label: 'Average confidence', value: avgConf, note: scope },
  ];

  return (
    <div className="min-h-dvh pt-24 pb-20 px-5 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="page-title">Welcome back, {user?.full_name?.split(' ')[0]}</h1>
            <p className="mt-2 text-gray-400">Your recent detection activity.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/analyze" className="btn-primary">Analyze an image</Link>
            <Link to="/analyze/video" className="btn-secondary">Analyze a video</Link>
          </div>
        </div>

        <dl className="mt-10 grid grid-cols-2 lg:grid-cols-4 panel overflow-hidden">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`p-5 border-line ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}
            >
              <dt className="label">{s.label}</dt>
              <dd className="num mt-3 text-3xl text-bone">{s.value}</dd>
              <dd className="mt-1 text-xs text-gray-500">{s.note}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-12">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="heading text-xl text-bone">Recent results</h2>
            <Link to="/history" className="link text-sm">View history</Link>
          </div>

          {loading ? (
            <div className="panel flex items-center justify-center py-16">
              <div className="spinner" />
            </div>
          ) : recent.length === 0 ? (
            <div className="rounded-md border border-dashed border-line-strong px-6 py-14">
              <p className="heading text-lg text-bone">Nothing analyzed yet</p>
              <p className="mt-2 text-gray-400 max-w-md">
                Upload an image to get a verdict, a confidence score and the evidence behind it.
              </p>
              <Link to="/analyze" className="btn-secondary btn-sm mt-6">Analyze an image</Link>
            </div>
          ) : (
            <ul className="panel divide-y divide-line overflow-hidden">
              {recent.map((pred) => (
                <li key={pred.id}>
                  <Link
                    to={`/results/${pred.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[8.5rem_minmax(0,1fr)_auto_4rem] items-center gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-bone/[0.04] transition-colors"
                  >
                    <span className="order-2 sm:order-none justify-self-end sm:justify-self-start">
                      <span className={`tag ${pred.is_ai_generated ? 'tag-flag' : 'tag-real'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${pred.is_ai_generated ? 'bg-signal-500' : 'bg-real-400'}`} />
                        {pred.is_ai_generated ? 'AI-generated' : 'Genuine'}
                      </span>
                    </span>
                    <span className="order-1 sm:order-none text-sm text-bone truncate">{pred.original_filename}</span>
                    <span className="order-3 sm:order-none text-sm text-gray-500">
                      {new Date(pred.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="order-4 sm:order-none num text-sm text-gray-300 text-right">
                      {(pred.confidence * 100).toFixed(0)}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
