"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { analyzeRecording, type AnalysisProgress } from "@/services/analysisService";
import { connectDatabase, loadSavedQuestionnaires, loadSavedResults, saveQuestionnaire, saveResult } from "@/services/databaseService";
import { VHI_INSTRUMENT } from "@/data/vhi";
import { scoreVhi } from "@/lib/vhi";
import type { ClinicalInference, SessionResult, VhiResult } from "@/types";

type ClinicalData = {
  liveResult: ClinicalInference | null;
  results: SessionResult[];
  databaseConnected: boolean;
  databaseBusy: boolean;
  databaseError: string | null;
  connect: () => Promise<void>;
  loadFromDatabase: () => Promise<void>;
  uploadToDatabase: (sessionId: string) => Promise<void>;
  analyze: (file: File, userId: string, taskCode: string, timestamp: string, onProgress?: AnalysisProgress) => Promise<void>;
  /** VHI-30 self-reports, linked to voice results only by Subject ID. */
  questionnaires: VhiResult[];
  activeSubjectId: string;
  setActiveSubjectId: (subjectId: string) => void;
  completeQuestionnaire: (subjectId: string, answers: number[]) => VhiResult;
  uploadQuestionnaire: (id: string) => Promise<void>;
};

const ClinicalContext = createContext<ClinicalData | null>(null);

export function ClinicalDataProvider({ children }: { children: ReactNode }) {
  const [liveResult, setLiveResult] = useState<ClinicalInference | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [databaseConnected, setDatabaseConnected] = useState(false);
  const [databaseBusy, setDatabaseBusy] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [questionnaires, setQuestionnaires] = useState<VhiResult[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState("");
  const completeQuestionnaire = useCallback((subjectId: string, answers: number[]) => {
    const entry: VhiResult = { id: crypto.randomUUID(), subject_id: subjectId, completed_at: new Date().toISOString(),
      instrument_version: VHI_INSTRUMENT.version, answers: [...answers], scores: scoreVhi(answers) };
    setQuestionnaires(current => [entry, ...current]);
    setActiveSubjectId(subjectId);
    return entry;
  }, []);
  const analyze = useCallback(async (file: File, userId: string, taskCode: string, timestamp: string, onProgress?: AnalysisProgress) => {
    setLiveResult(null);
    const result = await analyzeRecording(file, userId, taskCode, timestamp, onProgress);
    setLiveResult(result);
    setResults(current => [{ id: crypto.randomUUID(), result }, ...current]);
  }, []);
  const connect = useCallback(async () => {
    setDatabaseBusy(true); setDatabaseError(null);
    try { await connectDatabase(); setDatabaseConnected(true); }
    catch (error) { setDatabaseConnected(false); setDatabaseError(error instanceof Error ? error.message : "DB connection failed."); throw error; }
    finally { setDatabaseBusy(false); }
  }, []);
  const loadFromDatabase = useCallback(async () => {
    if (!databaseConnected) throw new Error("먼저 데이터베이스를 연동하세요.");
    setDatabaseBusy(true); setDatabaseError(null);
    try {
      const [loaded, loadedVhi] = await Promise.all([loadSavedResults(), loadSavedQuestionnaires()]);
      setQuestionnaires(current => {
        const savedIds = new Set(current.map(entry => entry.databaseId).filter(Boolean));
        return [...current, ...loadedVhi.filter(entry => !savedIds.has(entry.databaseId))]
          .sort((left, right) => right.completed_at.localeCompare(left.completed_at));
      });
      setResults(current => {
        const savedIds = new Set(current.map(entry => entry.databaseAnalysisId).filter(Boolean));
        return [...current, ...loaded.filter(entry => !savedIds.has(entry.databaseAnalysisId))]
          .sort((left, right) => right.result.recording_timestamp.localeCompare(left.result.recording_timestamp));
      });
    } catch (error) { setDatabaseError(error instanceof Error ? error.message : "DB loading failed."); throw error; }
    finally { setDatabaseBusy(false); }
  }, [databaseConnected]);
  const uploadToDatabase = useCallback(async (sessionId: string) => {
    if (!databaseConnected) throw new Error("먼저 데이터베이스를 연동하세요.");
    const entry = results.find(item => item.id === sessionId);
    if (!entry || entry.databaseAnalysisId) throw new Error("업로드할 새 분석 결과가 없습니다.");
    setDatabaseBusy(true); setDatabaseError(null);
    try {
      const saved = await saveResult(entry.result);
      setResults(current => current.map(item => item.id === sessionId ? { ...item, databaseAnalysisId: saved.analysis_id } : item));
    } catch (error) { setDatabaseError(error instanceof Error ? error.message : "DB upload failed."); throw error; }
    finally { setDatabaseBusy(false); }
  }, [databaseConnected, results]);
  const uploadQuestionnaire = useCallback(async (id: string) => {
    if (!databaseConnected) throw new Error("먼저 데이터베이스를 연동하세요.");
    const entry = questionnaires.find(item => item.id === id);
    if (!entry || entry.databaseId) throw new Error("업로드할 새 문진 결과가 없습니다.");
    setDatabaseBusy(true); setDatabaseError(null);
    try {
      const saved = await saveQuestionnaire(entry);
      setQuestionnaires(current => current.map(item => item.id === id ? { ...item, databaseId: saved.questionnaire_id } : item));
    } catch (error) { setDatabaseError(error instanceof Error ? error.message : "DB upload failed."); throw error; }
    finally { setDatabaseBusy(false); }
  }, [databaseConnected, questionnaires]);
  const value = useMemo(() => ({ liveResult, results, analyze, databaseConnected, databaseBusy, databaseError, connect, loadFromDatabase, uploadToDatabase,
    questionnaires, activeSubjectId, setActiveSubjectId, completeQuestionnaire, uploadQuestionnaire }),
    [liveResult, results, analyze, databaseConnected, databaseBusy, databaseError, connect, loadFromDatabase, uploadToDatabase,
      questionnaires, activeSubjectId, completeQuestionnaire, uploadQuestionnaire]);
  return <ClinicalContext.Provider value={value}>{children}</ClinicalContext.Provider>;
}

export function useClinicalData(): ClinicalData {
  const context = useContext(ClinicalContext);
  if (!context) throw new Error("ClinicalDataProvider is required.");
  return context;
}
