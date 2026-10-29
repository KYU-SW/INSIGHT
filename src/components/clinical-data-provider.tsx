"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { analyzeRecording, type AnalysisProgress } from "@/services/analysisService";
import { connectDatabase, loadSavedResults, saveResult } from "@/services/databaseService";
import type { ClinicalInference, SessionResult } from "@/types";

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
};

const ClinicalContext = createContext<ClinicalData | null>(null);

export function ClinicalDataProvider({ children }: { children: ReactNode }) {
  const [liveResult, setLiveResult] = useState<ClinicalInference | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [databaseConnected, setDatabaseConnected] = useState(false);
  const [databaseBusy, setDatabaseBusy] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
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
      const loaded = await loadSavedResults();
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
  const value = useMemo(() => ({ liveResult, results, analyze, databaseConnected, databaseBusy, databaseError, connect, loadFromDatabase, uploadToDatabase }),
    [liveResult, results, analyze, databaseConnected, databaseBusy, databaseError, connect, loadFromDatabase, uploadToDatabase]);
  return <ClinicalContext.Provider value={value}>{children}</ClinicalContext.Provider>;
}

export function useClinicalData(): ClinicalData {
  const context = useContext(ClinicalContext);
  if (!context) throw new Error("ClinicalDataProvider is required.");
  return context;
}
