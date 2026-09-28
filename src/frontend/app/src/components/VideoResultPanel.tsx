import { useState } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertTriangle, CheckCircle, Film, Activity } from 'lucide-react';
import type { VideoInferenceResult } from '../types';

type ViewMode = 'keyframe' | 'saliency' | 'frequency';

const VIEW_CAPTIONS: Record<ViewMode, string> = {
  keyframe: 'The sampled frame with the highest manipulation score. The detected face is outlined.',
  saliency: 'Heatmap of the keyframe face crop highlighting regions with synthetic texture patterns.',
  frequency: 'Frequency spectrum of the keyframe face — blending and upsampling leave periodic artifacts.',
};

const TEMPORAL_LABELS: { key: keyof VideoInferenceResult['temporal']; label: string; hint: string }[] = [
  { key: 'face_flicker', label: 'Face flicker', hint: 'Face region changes more than the rest of the frame' },
  { key: 'box_jitter', label: 'Face box jitter', hint: 'Unstable face size / position between frames' },
  { key: 'sharpness_variance', label: 'Sharpness variance', hint: 'Inconsistent facial detail over time' },
  { key: 'face_coverage', label: 'Face coverage', hint: 'Share of sampled frames with a detected face' },
];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, '0');
  return `${m}:${sec}`;
}

export default function VideoResultPanel({ result, compact = false }: { result: VideoInferenceResult; compact?: boolean }) {
  const [viewMode, setViewMode] = useState<ViewMode>('keyframe');
  const confidence = (result.confidence * 100).toFixed(1);
  const fake = result.is_deepfake;
  const images: Record<ViewMode, string> = {
    keyframe: result.explanation.keyframe_png_base64,
    saliency: result.explanation.saliency_png_base64,
    frequency: result.explanation.frequency_map_png_base64,
  };
  const hasVisuals = Object.values(images).some(Boolean);

  const timeline = result.frame_scores.map((f) => ({
    t: f.timestamp_s,
    score: Math.round(f.score * 1000) / 10,
    face: f.face_detected,
  }));

  return (
    <div className="space-y-6">
      {/* Verdict */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Detection Result</div>
          <div className={`text-3xl font-bold flex items-center gap-2 ${fake ? 'text-rose-400' : 'text-emerald-400'}`}>
            {fake ? <AlertTriangle size={28} /> : <CheckCircle size={28} />}
            {fake ? 'Likely Deepfake' : 'Likely Authentic'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white">{confidence}%</div>
          <div className="text-xs text-gray-500">Confidence</div>
        </div>
      </div>

      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full rounded-full ${fake ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`}
        />
      </div>

      {/* Frame timeline */}
      <div className="bg-black/30 rounded-xl p-4 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Activity size={14} /> Per-frame manipulation score
          </span>
          <span className="text-xs text-gray-500">{result.frame_scores.length} frames sampled</span>
        </div>
        <div className={compact ? 'h-36' : 'h-48'}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="frameScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={fake ? '#f43f5e' : '#10b981'} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={fake ? '#f43f5e' : '#10b981'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="t" tickFormatter={formatTime} stroke="#6b7280" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#6b7280" fontSize={11} />
              <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" />
              <Tooltip
                contentStyle={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelFormatter={(t) => `t = ${formatTime(Number(t))}`}
                formatter={(v, _n, item) => [
                  `${v}%${(item?.payload as { face?: boolean })?.face ? '' : ' (no face)'}`,
                  'Fake score',
                ]}
              />
              <Area type="monotone" dataKey="score" stroke={fake ? '#f43f5e' : '#10b981'} fill="url(#frameScore)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Visual evidence */}
      {hasVisuals && (
        <div className="bg-black/30 rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-300">Most Suspicious Frame</span>
            <div className="flex bg-gray-800 p-0.5 rounded-lg">
              {(['keyframe', 'saliency', 'frequency'] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${viewMode === m ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                  onClick={() => setViewMode(m)}
                >
                  {m === 'saliency' ? 'Spatial' : m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-center bg-gray-900/50 rounded-lg overflow-hidden min-h-[200px]">
            {images[viewMode] ? (
              <img src={images[viewMode]} alt={viewMode} className={`${compact ? 'max-h-64' : 'max-h-96'} object-contain`} />
            ) : (
              <div className="flex items-center text-sm text-gray-600">Visual not available</div>
            )}
          </div>
          <p className="text-xs text-center text-gray-500 mt-2">{VIEW_CAPTIONS[viewMode]}</p>
        </div>
      )}

      {/* Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Model Scores</div>
          <div className="space-y-2 text-sm">
            {[
              ['Frame average', result.scores.frame_mean],
              ['Top-25% frames', result.scores.frame_topk],
              ['Peak frame', result.scores.frame_max],
              ['Temporal inconsistency', result.scores.temporal],
            ].map(([label, v]) => (
              <div key={label as string} className="flex justify-between">
                <span className="text-gray-400">{label}</span>
                <span className="text-white font-mono">{((v as number) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Temporal Signals</div>
          <div className="space-y-2 text-sm">
            {TEMPORAL_LABELS.map(({ key, label, hint }) => (
              <div key={key} className="flex justify-between" title={hint}>
                <span className="text-gray-400">{label}</span>
                <span className="text-white font-mono">{(result.temporal[key] * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {[
          ['Duration', formatTime(result.video_meta.duration_s)],
          ['Resolution', `${result.video_meta.width}×${result.video_meta.height}`],
          ['Frame rate', `${result.video_meta.fps} fps`],
          ['Latency', `${result.inference_ms}ms`],
        ].map(([label, v]) => (
          <div key={label} className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
            <div className="text-gray-500 mb-1 flex items-center gap-1">
              {label === 'Duration' && <Film size={11} />} {label}
            </div>
            <div className="text-white font-mono">{v}</div>
          </div>
        ))}
      </div>

      {result.warnings.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-300 space-y-1">
            {result.warnings.map((w) => <p key={w}>{w}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}
