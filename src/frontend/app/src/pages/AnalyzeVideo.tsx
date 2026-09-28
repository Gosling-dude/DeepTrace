import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { videoApi } from '../api/client';
import { Upload, Loader2, Film, X, ScanFace } from 'lucide-react';
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
      toast.success('Video analysis complete!');
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
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Analyze Video</h1>
            <p className="text-gray-400">Detect face-swap and reenactment deepfakes using frame-level and temporal analysis.</p>
          </div>
          <MediaTypeSwitch active="video" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Upload Panel */}
          <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Film size={18} /> Upload Video
              </h2>

              {!preview ? (
                <div
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200
                    ${dragActive ? 'border-blue-400 bg-blue-500/10' : 'border-gray-700 hover:border-gray-500 hover:bg-white/[0.02]'}`}
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
                  <Upload size={40} className="text-gray-500 mx-auto mb-4" />
                  <p className="text-white font-medium mb-1">Drag & drop a video here</p>
                  <p className="text-sm text-gray-500">or click to browse • MP4, MOV, WebM, AVI up to {MAX_VIDEO_MB}MB</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-black/30">
                    <video src={preview} controls muted className="w-full max-h-80 object-contain" />
                    <button
                      onClick={resetUpload}
                      disabled={loading}
                      className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 flex items-center justify-center text-gray-300 hover:text-white hover:bg-black/80 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <Film size={14} />
                    <span className="truncate">{file?.name}</span>
                    <span className="text-gray-600">•</span>
                    <span>{((file?.size || 0) / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>

                  <button onClick={handleAnalyze} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Sampling frames & analyzing...
                      </>
                    ) : (
                      <>
                        <ScanFace size={18} />
                        Analyze Video
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="mt-6 space-y-2 text-xs text-gray-500">
                <p className="font-semibold text-gray-400 uppercase tracking-wider">How it works</p>
                <p>1. Frames are sampled uniformly across the clip and faces are located in each.</p>
                <p>2. Each face is scored by the spatial + frequency detection ensemble.</p>
                <p>3. Temporal signals (face flicker, jitter, detail consistency) expose frame-by-frame generation.</p>
              </div>
            </div>
          </motion.div>

          {/* Results Panel */}
          <motion.div className="lg:col-span-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={`glass-card p-6 border ${result.is_deepfake ? 'border-rose-500/30' : 'border-emerald-500/30'}`}
                >
                  <VideoResultPanel result={result} compact />
                  <button onClick={() => navigate(`/video-results/${result.id}`)} className="btn-secondary w-full mt-6 text-sm">
                    View Full Report
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-card h-full min-h-[500px] flex items-center justify-center"
                >
                  <div className="text-center">
                    <ScanFace size={48} className="text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500">Upload a video to see deepfake detection results</p>
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
