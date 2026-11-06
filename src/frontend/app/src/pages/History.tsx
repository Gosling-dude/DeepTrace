import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { imageApi, videoApi } from '../api/client';
import { Trash2, ChevronLeft, ChevronRight, Loader2, FileImage, Film } from 'lucide-react';
import type { PredictionHistoryItem, VideoHistoryItem } from '../types';

type MediaType = 'image' | 'video';

/** Normalised row so image and video history share one table. */
interface HistoryRow {
  id: string;
  filename: string;
  sizeLabel: string;
  flagged: boolean;
  confidence: number;
  inference_ms: number;
  created_at: string;
}

const MEDIA = {
  image: {
    api: imageApi,
    detailPath: (id: string) => `/results/${id}`,
    analyzePath: '/analyze',
    labels: { flagged: 'AI-generated', clean: 'Genuine' },
    emptyCta: 'Analyze an image',
    toRow: (p: PredictionHistoryItem): HistoryRow => ({
      id: p.id,
      filename: p.original_filename,
      sizeLabel: `${(p.file_size_bytes / 1024).toFixed(0)} KB`,
      flagged: p.is_ai_generated,
      confidence: p.confidence,
      inference_ms: p.inference_ms,
      created_at: p.created_at,
    }),
  },
  video: {
    api: videoApi,
    detailPath: (id: string) => `/video-results/${id}`,
    analyzePath: '/analyze/video',
    labels: { flagged: 'Deepfake', clean: 'Authentic' },
    emptyCta: 'Analyze a video',
    toRow: (p: VideoHistoryItem): HistoryRow => ({
      id: p.id,
      filename: p.original_filename,
      sizeLabel: `${(p.file_size_bytes / (1024 * 1024)).toFixed(1)} MB, ${p.duration_s.toFixed(1)} s`,
      flagged: p.is_deepfake,
      confidence: p.confidence,
      inference_ms: p.inference_ms,
      created_at: p.created_at,
    }),
  },
};

export default function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mediaType: MediaType = searchParams.get('type') === 'video' ? 'video' : 'image';
  const media = MEDIA[mediaType];
  const [predictions, setPredictions] = useState<HistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 15;

  useEffect(() => {
    loadHistory();
  }, [page, mediaType]);

  const switchMedia = (type: MediaType) => {
    setPage(1);
    setSearchParams(type === 'video' ? { type: 'video' } : {});
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await media.api.getHistory(page, perPage);
      setPredictions(res.predictions.map(media.toRow as (p: any) => HistoryRow));
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
      await media.api.deletePrediction(id);
      toast.success('Prediction deleted');
      loadHistory();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="min-h-dvh pt-24 pb-20 px-5 sm:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
          <h1 className="page-title mb-2">History</h1>
          <p className="text-gray-400">Every image and video you have analyzed.</p>
        </motion.div>

        <div className="seg mb-4">
          {(['image', 'video'] as MediaType[]).map((type) => (
            <button
              key={type}
              onClick={() => switchMedia(type)}
              className={`seg-item ${mediaType === type ? 'is-active' : ''}`}
            >
              {type === 'image' ? <FileImage size={14} /> : <Film size={14} />}
              {type === 'image' ? 'Images' : 'Videos'}
            </button>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="panel">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="text-bone-mute animate-spin" />
            </div>
          ) : predictions.length === 0 ? (
            <div className="text-center py-20">
              {mediaType === 'image'
                ? <FileImage size={28} strokeWidth={1.5} className="text-gray-500 mx-auto mb-4" />
                : <Film size={28} strokeWidth={1.5} className="text-gray-500 mx-auto mb-4" />}
              <p className="text-gray-400 mb-4">Nothing analyzed yet.</p>
              <Link to={media.analyzePath} className="btn-primary inline-flex items-center gap-2 text-sm">
                {media.emptyCta}
              </Link>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">File</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">Verdict</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">Confidence</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">Latency</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">Date</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((pred) => (
                      <tr key={pred.id} className="border-b border-line hover:bg-bone/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <Link to={media.detailPath(pred.id)} className="text-sm text-bone hover:underline underline-offset-4 truncate max-w-[200px] block">
                            {pred.filename}
                          </Link>
                          <span className="text-xs text-gray-500">{pred.sizeLabel}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`tag ${pred.flagged ? 'tag-flag' : 'tag-real'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pred.flagged ? 'bg-signal-400' : 'bg-real-400'}`} />
                            {pred.flagged ? media.labels.flagged : media.labels.clean}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-bone font-mono">
                          {(pred.confidence * 100).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                          {pred.inference_ms} ms
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {new Date(pred.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(pred.id)}
                            className="w-9 h-9 inline-flex items-center justify-center text-gray-500 hover:text-signal-400 transition-colors"
                            title="Delete prediction"
                            aria-label={`Delete ${pred.filename}`}
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
                <div className="flex items-center justify-between px-6 py-4 border-t border-line">
                  <span className="text-sm text-gray-500">
                    Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 text-gray-400 hover:text-bone disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 text-gray-400 hover:text-bone disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
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
