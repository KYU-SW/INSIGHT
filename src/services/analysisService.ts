import { requireSubjectId } from "@/lib/subject-id";
import type { ClinicalInference } from "@/types";

export type AnalysisPhase = "uploading" | "analyzing";
export type AnalysisProgress = (phase: AnalysisPhase, uploadFraction: number) => void;

export function analyzeRecording(file: File, userId: string, taskCode: string, timestamp: string, onProgress?: AnalysisProgress): Promise<ClinicalInference> {
  const body = new FormData();
  body.append("file", file);
  body.append("user_id", requireSubjectId(userId));
  body.append("task_code", taskCode);
  body.append("recording_timestamp", timestamp);
  // XMLHttpRequest, not fetch: fetch exposes no upload progress.
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/analyze");
    request.responseType = "text";
    request.timeout = 5 * 60 * 1000;
    request.upload.onprogress = event => { if (event.lengthComputable) onProgress?.("uploading", event.loaded / event.total); };
    request.upload.onload = () => onProgress?.("analyzing", 1);
    request.onerror = () => reject(new Error("서버에 연결할 수 없습니다. 네트워크 상태를 확인하세요."));
    request.ontimeout = () => reject(new Error("분석 시간이 초과되었습니다. 잠시 후 다시 시도하세요."));
    request.onload = () => {
      let payload: unknown = null;
      try { payload = JSON.parse(request.responseText); } catch { /* non-JSON error page */ }
      if (request.status < 200 || request.status >= 300) {
        const detail = payload && typeof payload === "object" && "detail" in payload ? String(payload.detail) : `Analysis failed (HTTP ${request.status}).`;
        reject(new Error(detail));
      } else if (!payload) reject(new Error("서버 응답을 해석할 수 없습니다."));
      else resolve(payload as ClinicalInference);
    };
    onProgress?.("uploading", 0);
    request.send(body);
  });
}
