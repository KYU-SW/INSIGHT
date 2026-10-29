"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Activity, FileAudio } from "lucide-react";
import { useClinicalData } from "@/components/clinical-data-provider";
import { VOICE_TASKS } from "@/data/tasks";
import { convertToWav, needsConversion } from "@/lib/audio-convert";
import { SUBJECT_ID_HINT, isValidSubjectId, normalizeSubjectId } from "@/lib/subject-id";
import type { ClinicalInference } from "@/types";

function metric(value: number | null, unit: string, digits = 1) {
  return value === null ? "Unavailable" : `${value.toFixed(digits)}${unit}`;
}

function Metric({ title, subtitle, value, compact = false }: { title: string; subtitle?: string; value: string; compact?: boolean }) {
  return <div className="result-metric rounded bg-surface-container-low p-unit-md"><dt className="text-[11px] font-semibold text-on-surface-variant">{title}</dt>{subtitle && <p className="text-[10px] text-on-surface-variant">{subtitle}</p>}<dd className={`mt-2 break-words text-primary ${compact ? "text-[15px] font-semibold" : "font-data-lg text-data-lg"}`}>{value}</dd></div>;
}

export function Result({ result, sessionId }: { result: ClinicalInference; sessionId?: string }) {
  const { results, databaseConnected, databaseBusy, uploadToDatabase } = useClinicalData();
  const [uploadError, setUploadError] = useState("");
  const entry = results.find(item => item.id === sessionId);
  const requiredMeasurements = [result.recording_quality.rms_dbfs, result.acoustic.mean_pitch_hz,
    result.acoustic.pitch_sd_hz, result.acoustic.pitch_cv, result.acoustic.intensity_cv,
    result.acoustic.mean_intensity_dbfs];
  const canUpload = requiredMeasurements.every(value => value !== null && Number.isFinite(value));
  async function upload() {
    if (!sessionId) return;
    setUploadError("");
    try { await uploadToDatabase(sessionId); }
    catch (error) { setUploadError(error instanceof Error ? error.message : "DB upload failed."); }
  }
  const a = result.acoustic;
  const quality = result.recording_quality;
  const statusLabel = result.model.status === "normal" ? "정상 / Normal" : result.model.status === "caution" ? "주의 / Caution" : result.model.status === "high_risk" ? "위험 / High Risk" : "미분류 / Unclassified";
  return <div className="result-workspace flex flex-col gap-unit-md">
    <section className="patient-banner rounded bg-surface-container-lowest p-unit-lg shadow-sm">
      <div className="mb-unit-md flex flex-wrap items-center justify-between gap-2 border-b border-surface-container pb-unit-xs"><h2 className="text-headline-lg text-primary">Patient / Recording Information</h2></div>
      <dl className="grid gap-unit-md sm:grid-cols-3">
        <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">Subject ID</dt><dd className="mt-1 font-data-md text-primary">{result.user_id}</dd></div>
        <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">Recording Time</dt><dd className="mt-1 font-data-md text-primary">{new Date(result.recording_timestamp).toLocaleString("ko-KR")}</dd></div>
        <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">Task</dt><dd className="mt-1 font-data-md text-primary">{result.task.label}</dd></div>
      </dl>
    </section>
    <section className="rounded bg-surface-container-lowest p-unit-lg shadow-sm" aria-labelledby="analysis-result-title">
      <div className="flex items-center gap-2 border-b border-surface-container pb-unit-xs"><Activity size={20} className="text-secondary" /><h2 id="analysis-result-title" className="text-headline-lg text-primary">AI Voice Analysis Result</h2></div>
      <div className="mt-unit-md grid gap-unit-sm lg:grid-cols-12">
        <div className="rounded bg-surface-container-low p-unit-md lg:col-span-5"><p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">음성이상점수</p><h3 className="text-headline-sm text-primary">Voice Abnormality Score</h3><p className="result-score my-unit-md font-data-lg text-[48px] font-bold leading-none text-primary">{result.model.display_score.toFixed(1)}<span className="ml-2 text-headline-lg font-normal text-on-surface-variant">/ 100</span></p></div>
        <dl className="grid gap-unit-sm sm:grid-cols-3 lg:col-span-7">
          <Metric compact title="분석 상태 / Status" value={statusLabel} />
          <Metric compact title="Recording Quality" subtitle={`Duration ${quality.duration_seconds.toFixed(1)} s · RMS ${metric(quality.rms_dbfs, " dBFS")}`} value={quality.assessment ?? "등급 미설정 / Unrated"} />
          <Metric compact title="Model" value={result.model.name} />
        </dl>
      </div>
      <p className="mt-unit-sm text-[11px] text-on-surface-variant">Near-full-scale samples: {quality.near_full_scale_percent.toFixed(2)}%</p>
    </section>
    {result.task.code.startsWith("vowel_") && <section className="rounded bg-surface-container-lowest p-unit-lg shadow-sm">
      <h2 className="text-headline-lg text-primary">모음 발성 분석 <span className="block text-body-sm text-on-surface-variant">Sustained Vowel Analysis</span></h2>
      <dl className="mt-unit-md grid gap-unit-sm sm:grid-cols-3">
        <Metric title="발성 안정성" subtitle="Phonation Stability" value={metric(result.phonation.stability, "")} />
        <Metric title="Pitch Stability" subtitle="F0 CV" value={metric(result.phonation.pitch_stability === null ? null : result.phonation.pitch_stability * 100, "%", 2)} />
        <Metric title="음성 강도 안정성" subtitle="Intensity Stability · RMS CV" value={metric(result.phonation.intensity_stability === null ? null : result.phonation.intensity_stability * 100, "%", 2)} />
      </dl>
    </section>}
    <section className="rounded bg-surface-container-lowest p-unit-lg shadow-sm">
      <h2 className="text-headline-lg text-primary">Acoustic Parameters</h2>
      <dl className="mt-unit-md grid gap-unit-sm sm:grid-cols-2 lg:grid-cols-4">
        <Metric title="Jitter (%)" value={metric(a.jitter_percent, "%")} />
        <Metric title="Shimmer (%)" value={metric(a.shimmer_percent, "%")} />
        <Metric title="HNR (dB)" value={metric(a.hnr_db, " dB")} />
        <Metric title="Mean F0" value={metric(a.mean_pitch_hz, " Hz")} />
        <Metric title="F0 SD" value={metric(a.pitch_sd_hz, " Hz")} />
        <Metric title="F0 CV" value={metric(a.pitch_cv === null ? null : a.pitch_cv * 100, "%", 2)} />
        <Metric title="Intensity CV" value={metric(a.intensity_cv === null ? null : a.intensity_cv * 100, "%", 2)} />
        <Metric title="Relative Acoustic Level" subtitle="dBFS · 비보정 신호" value={metric(a.mean_intensity_dbfs, " dBFS")} />
      </dl>
      {sessionId && <div className="mt-unit-md flex flex-wrap items-center gap-3 border-t border-surface-container pt-unit-md"><button type="button" onClick={() => void upload()} disabled={!databaseConnected || databaseBusy || !canUpload || !!entry?.databaseAnalysisId} className="rounded bg-primary-container px-4 py-2 text-body-sm font-medium text-white disabled:opacity-50">{entry?.databaseAnalysisId ? "DB 업로드 완료" : databaseBusy ? "업로드 중…" : "DB 업로드"}</button>{uploadError && <p role="alert" className="w-full text-body-sm text-error">{uploadError}</p>}</div>}
    </section>
  </div>;
}

export function LiveAnalysis() {
  const { analyze, liveResult, results } = useClinicalData();
  const [userId, setUserId] = useState("");
  const [taskCode, setTaskCode] = useState("vowel_a");
  const [recordingTime, setRecordingTime] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true); setError("");
    try {
      let upload = file;
      if (needsConversion(file)) { setStatus("오디오를 16 kHz WAV로 변환 중…"); upload = await convertToWav(file); }
      await analyze(upload, normalizeSubjectId(userId), taskCode, new Date(recordingTime).toISOString(), (phase, fraction) =>
        setStatus(phase === "uploading" ? `업로드 중… ${Math.round(fraction * 100)}%` : "서버에서 HuBERT 분석 중… (수십 초 걸릴 수 있습니다)"));
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Analysis failed."); }
    finally { setBusy(false); setStatus(""); }
  }
  return <div className="analysis-workspace flex min-w-0 flex-col gap-unit-lg">
    <section className="rounded bg-surface-container-lowest p-unit-lg shadow-sm"><div className="flex items-center gap-2"><FileAudio size={22} className="text-secondary" /><h1 className="text-headline-lg text-primary">ALS 음성 분석 · Voice Screening</h1></div>
      <form onSubmit={submit} className="mt-unit-md grid gap-unit-md md:grid-cols-5 md:items-end">
        <label className="text-body-sm font-medium">Subject ID<input required maxLength={80} value={userId} onChange={event => setUserId(event.target.value.toUpperCase())} pattern="[A-Z0-9_\\-]{1,80}" title={SUBJECT_ID_HINT} placeholder="SUBJ_001" autoCapitalize="characters" spellCheck={false} className="mt-1 min-h-11 w-full rounded border border-outline-variant bg-white px-3 py-2 text-base md:text-body-md" /></label>
        <label className="text-body-sm font-medium">Task<select value={taskCode} onChange={event => setTaskCode(event.target.value)} className="mt-1 min-h-11 w-full rounded border border-outline-variant bg-white px-3 py-2 text-base md:text-body-md">{VOICE_TASKS.map(task => <option key={task.code} value={task.code}>{task.label}</option>)}</select></label>
        <label className="text-body-sm font-medium">Recording Time<input required type="datetime-local" value={recordingTime} onChange={event => setRecordingTime(event.target.value)} className="mt-1 min-h-11 w-full rounded border border-outline-variant bg-white px-3 py-2 text-base md:text-body-md" /></label>
        <label className="text-body-sm font-medium">Audio file<input required type="file" accept="audio/*,.wav,.flac,.ogg,.m4a,.mp3,.aac" onChange={event => setFile(event.target.files?.[0] ?? null)} className="mt-1 w-full text-body-sm" /></label>
        <button disabled={busy || !file || !isValidSubjectId(normalizeSubjectId(userId)) || !recordingTime} className="min-h-11 rounded bg-primary-container px-4 py-2 font-medium text-white disabled:opacity-50">{busy ? "Analyzing…" : "Analyze recording"}</button>
      </form>
      {previewUrl && <audio controls src={previewUrl} className="mt-3 w-full" aria-label="선택한 음성 파일 미리듣기" />}
      {busy && status && <p role="status" aria-live="polite" className="mt-3 rounded bg-surface-container-low p-2 text-body-sm text-primary">{status}</p>}
      {error && <p role="alert" className="mt-3 rounded bg-error-container p-2 text-body-sm text-on-error-container">{error}</p>}
    </section>
    {liveResult && <Result result={liveResult} sessionId={results.find(entry => entry.result === liveResult)?.id} />}
  </div>;
}
