/**
 * TypeScript type definitions for the application.
 */

export interface InferenceResult {
  id: string;
  is_ai_generated: boolean;
  confidence: number;
  model_version: string;
  scores: {
    cnn: number;
    freq: number;
    ensemble: number;
  };
  explanation: {
    saliency_png_base64: string;
    frequency_map_png_base64: string;
  };
  warnings: string[];
  inference_ms: number;
  upload_id?: string;
  original_filename?: string;
  created_at?: string;
}

export interface PredictionHistoryItem {
  id: string;
  upload_id: string;
  is_ai_generated: boolean;
  confidence: number;
  model_version: string;
  inference_ms: number;
  warnings: string[];
  original_filename: string;
  file_size_bytes: number;
  created_at: string;
}

export interface PredictionHistoryResponse {
  predictions: PredictionHistoryItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface FrameScore {
  index: number;
  timestamp_s: number;
  score: number;
  face_detected: boolean;
}

export interface TemporalFeatures {
  face_flicker: number;
  box_jitter: number;
  sharpness_variance: number;
  face_coverage: number;
  score: number;
}

export interface VideoMeta {
  duration_s: number;
  fps: number;
  width: number;
  height: number;
  total_frames: number;
  sampled_frames: number;
}

export interface VideoInferenceResult {
  id: string;
  is_deepfake: boolean;
  confidence: number;
  model_version: string;
  scores: {
    frame_mean: number;
    frame_max: number;
    frame_topk: number;
    temporal: number;
    ensemble: number;
  };
  temporal: TemporalFeatures;
  frame_scores: FrameScore[];
  keyframe_index: number | null;
  video_meta: VideoMeta;
  explanation: {
    keyframe_png_base64: string;
    saliency_png_base64: string;
    frequency_map_png_base64: string;
  };
  warnings: string[];
  inference_ms: number;
  upload_id?: string;
  original_filename?: string;
  created_at?: string;
}

export interface VideoHistoryItem {
  id: string;
  upload_id: string;
  is_deepfake: boolean;
  confidence: number;
  model_version: string;
  inference_ms: number;
  warnings: string[];
  duration_s: number;
  original_filename: string;
  file_size_bytes: number;
  created_at: string;
}

export interface VideoHistoryResponse {
  predictions: VideoHistoryItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface PlatformStats {
  total_users: number;
  active_users_today: number;
  active_users_week: number;
  active_users_month: number;
  total_uploads: number;
  total_predictions: number;
  ai_detected_count: number;
  real_detected_count: number;
  avg_confidence: number;
  avg_inference_ms: number;
  error_rate: number;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
}

export interface AiVsRealPoint {
  date: string;
  ai: number;
  real: number;
}

export interface ConfidenceBin {
  range: string;
  count: number;
}

export interface AnalyticsTrends {
  daily_predictions: TimeSeriesPoint[];
  daily_signups: TimeSeriesPoint[];
  confidence_distribution: ConfidenceBin[];
  ai_vs_real_trend: AiVsRealPoint[];
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  created_at: string;
}

export interface UserListItem {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_login: string | null;
}
