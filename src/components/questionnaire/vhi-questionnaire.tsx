"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { useClinicalData } from "@/components/clinical-data-provider";
import { VHI_DOMAIN_LABELS, VHI_INSTRUMENT, VHI_ITEMS, VHI_SCALE } from "@/data/vhi";
import { SUBJECT_ID_HINT, isValidSubjectId, normalizeSubjectId } from "@/lib/subject-id";
import { isCompleteVhi } from "@/lib/vhi";
import { deleteQuestionnaireDraft, loadQuestionnaireDraft, saveQuestionnaireDraft } from "@/services/databaseService";
import type { VhiResult } from "@/types";

const TOTAL = VHI_ITEMS.length;
const clock = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("ko-KR") : "");

function draftLabel(state: { kind: string; at?: string; count?: number }) {
  switch (state.kind) {
    case "saving": return "임시 저장 중…";
    case "saved": return state.at ? `임시 저장됨 ${clock(state.at)}` : "임시 저장 켜짐";
    case "restored": return `임시 저장된 응답 ${state.count}개를 불러왔습니다 (${clock(state.at)})`;
    case "failed": return "임시 저장 실패: 응답은 이 화면에 남아 있습니다. 연결 상태를 확인하세요.";
    default: return "임시 저장 꺼짐 (DB 미연동)";
  }
}

/** Domain + total scores only. VHI.md: no severity grade without a validated Korean cutoff. */
export function VhiSummary({ entry, heading = "VHI-30 자가보고 · Self-report" }: { entry: VhiResult; heading?: string }) {
  const cells = [
    { label: "총점 Total", value: entry.scores.total, max: 120 },
    { label: `${VHI_DOMAIN_LABELS.functional.ko} F`, value: entry.scores.functional, max: 40 },
    { label: `${VHI_DOMAIN_LABELS.physical.ko} P`, value: entry.scores.physical, max: 40 },
    { label: `${VHI_DOMAIN_LABELS.emotional.ko} E`, value: entry.scores.emotional, max: 40 },
  ];
  return <section className="vhi-summary rounded bg-surface-container-lowest p-unit-lg shadow-sm" aria-label={heading}>
    <h2 className="text-headline-lg text-primary">{heading}</h2>
    <p className="text-body-sm text-on-surface-variant">{entry.subject_id} · {new Date(entry.completed_at).toLocaleString("ko-KR")} · 개발용 한국어 번역</p>
    <dl className="vhi-score-grid">{cells.map(cell => <div key={cell.label}><dt>{cell.label}</dt><dd>{cell.value}<span> / {cell.max}</span></dd></div>)}</dl>
    <p className="text-body-sm text-on-surface-variant">점수가 높을수록 환자가 인식하는 음성 관련 불편이 큽니다. 검증된 한국어 기준값이 없어 중증도 등급은 표시하지 않으며, AI 음성이상점수와는 별개의 자가보고 지표입니다.</p>
  </section>;
}

export function VhiQuestionnaire() {
  const { activeSubjectId, setActiveSubjectId, completeQuestionnaire, uploadQuestionnaire, questionnaires, databaseConnected, databaseBusy } = useClinicalData();
  const [subjectInput, setSubjectInput] = useState(activeSubjectId);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<(number | undefined)[]>(() => Array(TOTAL).fill(undefined));
  const [index, setIndex] = useState(0);
  const [notice, setNotice] = useState("");
  const [completedId, setCompletedId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  // Draft autosave to questionnaire_drafts/{subjectId}; only while the DB is connected.
  const [draftState, setDraftState] = useState<{ kind: "off" | "saving" | "saved" | "failed" | "restored"; at?: string; count?: number }>({ kind: "off" });
  const [starting, setStarting] = useState(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const completed = questionnaires.find(entry => entry.id === completedId);
  const answered = answers.filter(value => value !== undefined).length;
  const item = VHI_ITEMS[index];

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeSubjectId(subjectInput);
    if (!isValidSubjectId(normalized)) { setNotice(SUBJECT_ID_HINT); return; }
    setNotice(""); setActiveSubjectId(normalized);
    let restored: (number | undefined)[] = Array(TOTAL).fill(undefined), restoredIndex = 0;
    if (databaseConnected) {
      setStarting(true);
      try {
        const draft = await loadQuestionnaireDraft(normalized);
        const count = draft?.answers.filter(value => value !== null).length ?? 0;
        if (draft && count > 0) {
          restored = draft.answers.map(value => value ?? undefined);
          restoredIndex = draft.current_index;
          setDraftState({ kind: "restored", at: draft.updated_at, count });
        } else setDraftState({ kind: "saved" });
      } catch { setDraftState({ kind: "failed" }); }
      finally { setStarting(false); }
    } else setDraftState({ kind: "off" });
    setAnswers(restored); setIndex(restoredIndex); setSubjectId(normalized);
  }
  function persist(nextAnswers: (number | undefined)[], nextIndex: number) {
    if (!subjectId || !databaseConnected) return;
    setDraftState(current => ({ ...current, kind: "saving" }));
    // Serialize writes so an older draft never overwrites a newer one.
    saveQueue.current = saveQueue.current.then(async () => {
      const saved = await saveQuestionnaireDraft(subjectId, nextAnswers.map(value => value ?? null), nextIndex);
      setDraftState({ kind: "saved", at: saved.updated_at });
    }).catch(() => setDraftState({ kind: "failed" }));
  }
  function select(value: number) {
    const nextAnswers = answers.map((answer, i) => (i === index ? value : answer));
    setAnswers(nextAnswers);
    setNotice("");
    persist(nextAnswers, index);
  }
  function move(nextIndex: number) {
    setIndex(nextIndex);
    persist(answers, nextIndex);
  }
  function next() {
    if (answers[index] === undefined) { setNotice("이 문항에 먼저 응답해 주세요."); return; }
    setNotice(""); move(Math.min(index + 1, TOTAL - 1));
  }
  async function discardDraft() {
    if (!subjectId) return;
    await saveQueue.current;
    try { await deleteQuestionnaireDraft(subjectId); setDraftState({ kind: "saved" }); } catch { setDraftState({ kind: "failed" }); }
    setAnswers(Array(TOTAL).fill(undefined)); setIndex(0);
  }
  function submit() {
    if (!subjectId || !isCompleteVhi(answers)) {
      const missing = answers.findIndex(value => value === undefined);
      setNotice(`${TOTAL}개 문항에 모두 응답해 주세요. 미응답: 문항 ${missing + 1}`);
      if (missing >= 0) setIndex(missing);
      return;
    }
    persist(answers, index);
    setCompletedId(completeQuestionnaire(subjectId, [...answers]).id);
  }
  function restart() {
    setAnswers(Array(TOTAL).fill(undefined)); setIndex(0); setCompletedId(null); setSubjectId(null); setNotice(""); setUploadError(""); setDraftState({ kind: "off" });
  }
  async function upload() {
    if (!completed) return;
    setUploadError("");
    await saveQueue.current; // the server deletes the draft after storing; let pending draft writes land first
    try { await uploadQuestionnaire(completed.id); setDraftState({ kind: "off" }); }
    catch (error) { setUploadError(error instanceof Error ? error.message : "DB upload failed."); }
  }

  // Desktop shortcut: keys 0-4 answer the current item.
  useEffect(() => {
    if (!subjectId || completedId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement && event.target.type !== "radio") return;
      if (/^[0-4]$/.test(event.key)) select(Number(event.key));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const header = <section className="rounded bg-surface-container-lowest p-unit-lg shadow-sm">
    <div className="flex items-center gap-2"><ClipboardList size={22} className="text-secondary" aria-hidden="true" /><h1 className="text-headline-lg text-primary">VHI-30 음성장애지수 문진 · Voice Handicap Index</h1></div>
    <p className="mt-1 text-body-sm text-on-surface-variant">목소리 문제가 일상생활에 얼마나 자주 영향을 미치는지 답해 주세요. 30문항 · 0 전혀 없음 ~ 4 항상</p>
  </section>;

  if (completed) return <div className="vhi-workspace flex flex-col gap-unit-md">{header}
    <VhiSummary entry={completed} heading="문진 제출 완료 · VHI-30 Result" />
    <section className="rounded bg-surface-container-lowest p-unit-lg shadow-sm">
      <div className="vhi-actions">
        <Link href="/analysis" className="vhi-primary">음성 분석으로 이동 →</Link>
        <button type="button" onClick={() => void upload()} disabled={!databaseConnected || databaseBusy || !!completed.databaseId} className="vhi-secondary">{completed.databaseId ? "DB 업로드 완료" : databaseBusy ? "업로드 중…" : "DB 업로드"}</button>
        <button type="button" onClick={restart} className="vhi-secondary">새 문진</button>
      </div>
      {!databaseConnected && <p className="mt-2 text-body-sm text-on-surface-variant">DB 업로드는 상단 DB 연동 후 사용할 수 있습니다. 결과는 현재 브라우저 세션에 유지됩니다.</p>}
      {databaseConnected && !completed.databaseId && <p className="mt-2 text-body-sm text-on-surface-variant">응답은 임시 저장되어 있습니다. DB 업로드 시 최종 결과로 저장되고 임시 저장본은 삭제됩니다.</p>}
      {uploadError && <p role="alert" className="mt-2 text-body-sm text-error">{uploadError}</p>}
    </section>
  </div>;

  if (!subjectId) return <div className="vhi-workspace flex flex-col gap-unit-md">{header}
    <section className="rounded bg-surface-container-lowest p-unit-lg shadow-sm">
      <form onSubmit={start} className="vhi-start">
        <label className="text-body-sm font-medium">Subject ID (가명)<input required maxLength={80} value={subjectInput} onChange={event => setSubjectInput(event.target.value.toUpperCase())} placeholder="SUBJ_001" autoCapitalize="characters" spellCheck={false} title={SUBJECT_ID_HINT} /></label>
        <button type="submit" disabled={starting} className="vhi-primary">{starting ? "임시 저장 확인 중…" : "문진 시작"}</button>
      </form>
      <p className="mt-2 text-body-sm text-on-surface-variant">실명이나 병원 등록번호 대신 가명 ID를 입력하세요. 같은 Subject ID의 음성 분석 결과와 함께 조회됩니다. {databaseConnected ? "DB 연동 중: 응답이 자동 임시 저장되고, 같은 ID로 다시 시작하면 이어서 작성합니다." : "상단 DB 연동 후 시작하면 응답이 자동 임시 저장됩니다."}</p>
      {notice && <p role="alert" className="mt-2 text-body-sm text-error">{notice}</p>}
    </section>
  </div>;

  return <div className="vhi-workspace flex flex-col gap-unit-md">{header}
    <section className="vhi-card rounded bg-surface-container-lowest shadow-sm" aria-label={`문항 ${item.number}`}>
      <div className="vhi-progress-head"><span>문진 진행률 · {subjectId}</span><span>{answered} / {TOTAL} 응답</span></div>
      <p className="vhi-draft" role="status" aria-live="polite" data-kind={draftState.kind}>{draftLabel(draftState)}{draftState.kind === "restored" && <button type="button" onClick={() => void discardDraft()}>처음부터 다시</button>}</p>
      <div role="progressbar" aria-label="문진 진행률" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={answered} className="score-track"><span style={{ width: `${(answered / TOTAL) * 100}%` }} /></div>
      <div className="vhi-question">
        <div className="vhi-meta"><span className="vhi-domain" data-domain={item.domain}>{VHI_DOMAIN_LABELS[item.domain].ko}</span><span>문항 {index + 1} / {TOTAL}</span></div>
        <h2 id="vhi-question-text">{item.text}</h2>
        <fieldset aria-labelledby="vhi-question-text">
          <legend className="sr-only">해당하는 점수를 선택해 주세요</legend>
          <div className="vhi-options">{VHI_SCALE.map(option => <label key={option.value} data-selected={answers[index] === option.value || undefined}>
            <input className="sr-only" type="radio" name={`vhi-${item.number}`} value={option.value} checked={answers[index] === option.value} onChange={() => select(option.value)} />
            <b>{option.value}</b><span>{option.label}</span>
          </label>)}</div>
        </fieldset>
        {notice && <p role="alert" className="mt-2 text-body-sm text-error">{notice}</p>}
      </div>
      <div className="vhi-nav">
        <button type="button" onClick={() => { setNotice(""); move(Math.max(0, index - 1)); }} disabled={index === 0} className="vhi-secondary">이전 문항</button>
        {index === TOTAL - 1
          ? <button type="button" onClick={submit} className="vhi-primary">문진 제출</button>
          : <button type="button" onClick={next} className="vhi-primary">다음 문항 →</button>}
      </div>
    </section>
    <p className="text-body-sm text-on-surface-variant">{VHI_INSTRUMENT.name} · PhenX 영문판 기반 개발용 한국어 번역(공식 K-VHI 검증본 아님). 응답은 이 브라우저 세션에만 보관되며 DB 업로드는 직접 선택합니다.</p>
  </div>;
}
