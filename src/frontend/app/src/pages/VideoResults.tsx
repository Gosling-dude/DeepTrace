import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { videoApi } from '../api/client';
import { ArrowLeft, Film, Loader2 } from 'lucide-react';
import VideoResultPanel from '../components/VideoResultPanel';
import type { VideoInferenceResult } from '../types';

export default function VideoResults() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<VideoInferenceResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    videoApi.getPrediction(id)
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-dvh pt-24 flex items-center justify-center">
        <Loader2 size={32} className="text-bone-mute animate-spin" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-dvh pt-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Video prediction not found</p>
          <Link to="/history?type=video" className="btn-secondary">Back to history</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pt-24 pb-20 px-5 sm:px-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/history?type=video" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-bone mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to history
        </Link>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className={`panel p-8 border ${result.is_deepfake ? 'border-signal-500/30' : 'border-real-500/30'}`}>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
              <Film size={14} />
              <span className="truncate">{result.original_filename}</span>
              {result.created_at && (
                <>
                  <span className="text-gray-500">•</span>
                  <span>{new Date(result.created_at).toLocaleString()}</span>
                </>
              )}
              <span className="text-gray-500">•</span>
              <span>{result.model_version}</span>
            </div>
            <VideoResultPanel result={result} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
