import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { imageApi } from '../api/client';
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, Cpu, Loader2 } from 'lucide-react';
import type { InferenceResult } from '../types';

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'saliency' | 'frequency'>('saliency');

  useEffect(() => {
    if (id) loadResult();
  }, [id]);

  const loadResult = async () => {
    try {
      const data = await imageApi.getPrediction(id!);
      setResult(data);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 size={32} className="text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Prediction not found</p>
          <Link to="/history" className="btn-secondary">Back to History</Link>
        </div>
      </div>
    );
  }

  const confidence = (result.confidence * 100).toFixed(1);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to="/history" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to History
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className={`glass-card p-8 mb-6 border ${result.is_ai_generated ? 'border-rose-500/30' : 'border-emerald-500/30'}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Detection Verdict</div>
                <div className={`text-4xl font-bold flex items-center gap-3 ${result.is_ai_generated ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {result.is_ai_generated ? <AlertTriangle size={36} /> : <CheckCircle size={36} />}
                  {result.is_ai_generated ? 'AI Generated' : 'Genuine Image'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-white">{confidence}%</div>
                <div className="text-sm text-gray-500">Confidence Score</div>
              </div>
            </div>

            {/* Confidence bar */}
            <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confidence}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className={`h-full rounded-full ${result.is_ai_generated ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`}
              />
            </div>

            {/* Meta info */}
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              {result.original_filename && (
                <span className="text-gray-400">📄 {result.original_filename}</span>
              )}
              <span className="flex items-center gap-1 text-gray-400"><Clock size={14} /> {result.inference_ms}ms</span>
              <span className="flex items-center gap-1 text-gray-400"><Cpu size={14} /> {result.model_version}</span>
              {result.created_at && (
                <span className="text-gray-400">🕐 {new Date(result.created_at).toLocaleString()}</span>
              )}
            </div>
          </div>

          {/* Explainability */}
          {(result.explanation.saliency_png_base64 || result.explanation.frequency_map_png_base64) && (
            <div className="glass-card p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Visual Explainability</h3>
                <div className="flex bg-gray-800 p-0.5 rounded-lg">
                  <button
                    className={`px-4 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'saliency' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setViewMode('saliency')}
                  >
                    Spatial (Grad-CAM)
                  </button>
                  <button
                    className={`px-4 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'frequency' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setViewMode('frequency')}
                  >
                    Frequency Spectrum
                  </button>
                </div>
              </div>

              <div className="bg-black/30 rounded-xl p-6 flex justify-center min-h-[300px]">
                <img
                  src={viewMode === 'saliency' ? result.explanation.saliency_png_base64 : result.explanation.frequency_map_png_base64}
                  alt={viewMode === 'saliency' ? 'Grad-CAM Saliency Map' : 'Frequency Spectrum'}
                  className="max-h-96 object-contain rounded-lg"
                />
              </div>
              <p className="text-sm text-center text-gray-500 mt-3 max-w-lg mx-auto">
                {viewMode === 'saliency'
                  ? 'The spatial CNN highlights regions with suspicious texture patterns. Brighter areas indicate stronger activation.'
                  : 'The frequency domain analysis reveals periodic grid artifacts characteristic of GAN/Diffusion model upsampling operations.'}
              </p>
            </div>
          )}

          {/* Detailed Scores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Model Scores</h3>
              <div className="space-y-4">
                {Object.entries(result.scores).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300 capitalize">{key === 'cnn' ? 'Spatial CNN' : key === 'freq' ? 'Frequency Net' : 'Ensemble'}</span>
                      <span className="text-white font-mono">{(value * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${value * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Analysis Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400">Prediction ID</span>
                  <span className="text-white font-mono text-xs">{result.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400">Processing Time</span>
                  <span className="text-white">{result.inference_ms}ms</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400">Model Version</span>
                  <span className="text-white">{result.model_version}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Warnings</span>
                  <span className="text-white">{result.warnings.length > 0 ? result.warnings.join(', ') : 'None'}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
