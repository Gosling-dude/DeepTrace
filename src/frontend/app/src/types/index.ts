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
