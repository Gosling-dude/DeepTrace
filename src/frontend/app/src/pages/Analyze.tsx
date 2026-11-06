import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { imageApi } from '../api/client';
import { Upload, Loader2, FileImage, X, AlertTriangle, CheckCircle } from 'lucide-react';
import MediaTypeSwitch from '../components/MediaTypeSwitch';
import type { InferenceResult } from '../types';

export default function Analyze() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState<'saliency' | 'frequency'>('saliency');

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
  }, []);

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum 10MB.');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await imageApi.predict(file);
      setResult(res);
      toast.success('Analysis complete');
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

  const confidence = result ? (result.confidence * 100).toFixed(1) : '0';

  return (
    <div className="min-h-dvh pt-24 pb-20 px-5 sm:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="page-title mb-2">Analyze an image</h1>
            <p className="text-gray-400">Upload an image to check whether it is AI-generated or genuine.</p>
          </div>
          <MediaTypeSwitch active="image" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Panel */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <div className="panel p-6">
              <h2 className="heading text-lg text-bone mb-4">Image</h2>

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
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload size={28} strokeWidth={1.5} className="text-gray-500 mx-auto mb-4" />
                  <p className="text-bone font-medium mb-1">Drag & drop an image here</p>
                  <p className="text-sm text-gray-500">or click to browse. JPG, PNG or WebP, up to 10&nbsp;MB.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded overflow-hidden bg-ink-950 border border-line">
                    <img src={preview} alt="Preview" className="w-full max-h-80 object-contain" />
                    <button
                      onClick={resetUpload}
                      className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <FileImage size={14} />
                    <span className="truncate">{file?.name}</span>
                    <span className="num text-xs ml-auto shrink-0">{((file?.size || 0) / 1024).toFixed(0)} KB</span>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Analyzing…
                      </>
                    ) : (
                      <>
                        Analyze image
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Results Panel */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={`panel p-6 border ${result.is_ai_generated ? 'border-signal-500/30' : 'border-real-500/30'}`}
                >
                  {/* Verdict */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="label mb-2">Verdict</div>
                      <div className={`heading text-3xl flex items-center gap-2 ${result.is_ai_generated ? 'text-signal-400' : 'text-real-400'}`}>
                        {result.is_ai_generated ? <AlertTriangle size={28} /> : <CheckCircle size={28} />}
                        {result.is_ai_generated ? 'AI-generated' : 'Genuine image'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="num text-3xl text-bone">{confidence}%</div>
                      <div className="text-xs text-gray-500">Confidence</div>
                    </div>
                  </div>

                  {/* Confidence bar */}
                  <div className="mb-6">
                    <div className="h-1.5 rounded-sm bg-ink-950 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${confidence}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-full ${result.is_ai_generated ? 'bg-signal-500' : 'bg-real-400'}`}
                      />
                    </div>
                  </div>

                  {/* Explanation Visuals */}
                  {(result.explanation.saliency_png_base64 || result.explanation.frequency_map_png_base64) && (
                    <div className="well p-4 mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-300">Evidence</span>
                        <div className="seg">
                          <button
                            className={`seg-item ${viewMode === 'saliency' ? 'is-active' : ''}`}
                            onClick={() => setViewMode('saliency')}
                          >
                            Spatial
                          </button>
                          <button
                            className={`seg-item ${viewMode === 'frequency' ? 'is-active' : ''}`}
                            onClick={() => setViewMode('frequency')}
                          >
                            Frequency
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-center overflow-hidden min-h-[200px]">
                        <img
                          src={viewMode === 'saliency' ? result.explanation.saliency_png_base64 : result.explanation.frequency_map_png_base64}
                          alt={viewMode === 'saliency' ? 'Saliency Map' : 'Frequency Map'}
                          className="max-h-64 object-contain"
                        />
                      </div>
                      <p className="text-xs text-center text-gray-500 mt-2">
                        {viewMode === 'saliency'
                          ? 'Heatmap highlights regions where synthetic texture patterns were detected.'
                          : 'Frequency spectrum reveals periodic artifacts from AI upsampling.'}
                      </p>
                    </div>
                  )}

                  {/* Model Breakdown */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-2">Stream scores</div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Spatial CNN</span>
                          <span className="text-bone font-mono">{(result.scores.cnn * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Frequency Net</span>
                          <span className="text-bone font-mono">{(result.scores.freq * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-2">Diagnostics</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Latency</span>
                          <span className="text-bone font-mono">{result.inference_ms}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Model</span>
                          <span className="text-bone">{result.model_version}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
                      <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                      <span className="text-xs text-amber-300">{result.warnings.join(', ')}</span>
                    </div>
                  )}

                  {/* View details */}
                  <button
                    onClick={() => navigate(`/results/${result.id}`)}
                    className="btn-secondary w-full mt-4 text-sm"
                  >
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
                    <p className="text-gray-500">The report appears here once an image is analyzed.</p>
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
