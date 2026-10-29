export interface ClinicalInference {
  user_id: string;
  recording_timestamp: string;
  analyzed_at: string;
  task: { code: string; label: string };
  model: { name: "MLP_MAX_h07"; score: number; display_score: number; status: "normal" | "caution" | "high_risk" | null; status_reason: string | null };
  recording_quality: { assessment: null; duration_seconds: number; rms_dbfs: number | null; near_full_scale_percent: number };
  phonation: { stability: number | null; pitch_stability: number | null; intensity_stability: number | null };
  acoustic: {
    jitter_percent: number | null; shimmer_percent: number | null; hnr_db: number | null;
    mean_pitch_hz: number | null; pitch_sd_hz: number | null; pitch_cv: number | null;
    intensity_cv: number | null; mean_intensity_dbfs: number | null;
  };
}

export interface SessionResult {
  id: string;
  databaseAnalysisId?: string;
  result: ClinicalInference;
}
