/** RMS standardized-feature distance from the training distribution; in_distribution = distance <= threshold. */
export interface OodCheck { distance: number; threshold: number; in_distribution: boolean }

export interface ClinicalInference {
  user_id: string;
  recording_timestamp: string;
  analyzed_at: string;
  task: { code: string; label: string };
  model: {
    name: "MLP_MAX_h07"; score: number; display_score: number; status: "normal" | "caution" | "high_risk" | null; status_reason: string | null;
    /** Feature-space OOD gate (src/backend/model.py, ood_calibration.json); absent in older stored records. */
    ood?: OodCheck;
  };
  recording_quality: { assessment: null; duration_seconds: number; rms_dbfs: number | null; near_full_scale_percent: number };
  phonation: { stability: number | null; pitch_stability: number | null; intensity_stability: number | null };
  acoustic: {
    jitter_percent: number | null; shimmer_percent: number | null; hnr_db: number | null;
    /** Why jitter/shimmer/HNR are null (e.g. DDK task, too little voicing); absent in older stored records. */
    voice_quality_reason?: string | null;
    mean_pitch_hz: number | null; pitch_sd_hz: number | null; pitch_cv: number | null;
    intensity_cv: number | null; mean_intensity_dbfs: number | null;
  };
}

export interface SessionResult {
  id: string;
  databaseAnalysisId?: string;
  result: ClinicalInference;
}

export interface VhiResult {
  id: string;
  subject_id: string;
  completed_at: string;
  instrument_version: string;
  /** answers[i] is the 0-4 response to VHI item i + 1. */
  answers: number[];
  scores: { functional: number; physical: number; emotional: number; total: number };
  databaseId?: string;
}
