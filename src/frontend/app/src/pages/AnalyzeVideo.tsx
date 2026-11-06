import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { videoApi } from '../api/client';
import { Upload, Loader2, Film, X } from 'lucide-react';
import MediaTypeSwitch from '../components/MediaTypeSwitch';
import VideoResultPanel from '../components/VideoResultPanel';
import type { VideoInferenceResult } from '../types';

const MAX_VIDEO_MB = 100;
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v'];

export default function AnalyzeVideo() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VideoInferenceResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Release the object URL when the preview changes or the page unmounts.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const handleFile = useCallback((f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    if (!f.type.startsWith('video/') && !VIDEO_EXTENSIONS.includes(ext)) {
      toast.error('Please upload a video file');
      return;
    }
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`File too large. Maximum ${MAX_VIDEO_MB}MB.`);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await videoApi.predict(file);
      setResult(res);
      toast.success('Video analysis complete');
    } catch (error: any) {
      toast.error(error.detail || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  return (
    <div className="min-h-dvh pt-24 pb-20 px-5 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="page-title mb-2">Analyze a video</h1>
            <p className="text-gray-400">Check a clip for face-swap and reenactment deepfakes, frame by frame and over time.</p>
          </div>
          <MediaTypeSwitch active="video" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Upload Panel */}
          <motion.div className="lg:col-span-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <div className="panel p-6">
              <h2 className="heading text-lg text-bone mb-4">Video</h2>

              {!preview ? (
                <div
                  className={`relative border border-dashed rounded-md p-12 text-center cursor-pointer transition-colors duration-200
                    ${dragActive ? 'border-bone bg-bone/5' : 'border-line-strong hover:border-bone-mute hover:bg-bone/[0.03]'}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="video/*,.mkv"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload size={28} strokeWidth={1.5} className="text-gray-500 mx-auto mb-4" />
                  <p className="text-bone font-medium mb-1">Drag & drop a video here</p>
                  <p className="text-sm text-gray-500">or click to browse. MP4, MOV, WebM or AVI, up to {MAX_VIDEO_MB}&nbsp;MB.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded overflow-hidden bg-ink-950 border border-line">
                    <video src={preview} controls muted className="w-full max-h-80 object-contain" />
                    <button
                      onClick={resetUpload}
                      disabled={loading}
                      className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <Film size={14} />
                    <span className="truncate">{file?.name}</span>
                    <span className="num text-xs ml-auto shrink-0">{((file?.size || 0) / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>

                  <button onClick={handleAnalyze} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Sampling frames and analyzing…
                      </>
                    ) : (
                      <>
                        Analyze video
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="mt-6 pt-5 border-t border-line text-sm text-gray-400">
                <p className="font-medium text-gray-300">How it works</p>
                <ol className="mt-2 space-y-1.5 list-decimal list-inside marker:text-gray-500">
                  <li>Frames are sampled evenly across the clip and the face is located in each.</li>
                  <li>Each face is scored by the spatial and frequency streams.</li>
                  <li>Flicker, jitter and detail consistency are compared between frames.</li>
                </ol>
              </div>
            </div>
          </motion.div>

          {/* Results Panel */}
          <motion.div className="lg:col-span-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={`panel p-6 border ${result.is_deepfake ? 'border-signal-500/30' : 'border-real-500/30'}`}
                >
                  <VideoResultPanel result={result} compact />
                  <button onClick={() => navigate(`/video-results/${result.id}`)} className="btn-secondary w-full mt-6 text-sm">
                    View full report
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full min-h-[320px] lg:min-h-[500px] flex items-center justify-center rounded-md border border-dashed border-line-strong"
                >
                  <div className="text-center">
                    <p className="text-gray-500">The report appears here once a video is analyzed.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
