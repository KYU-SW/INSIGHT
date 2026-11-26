"use client";

import { useState } from "react";
import Link from "next/link";
import { useClinicalData } from "@/components/clinical-data-provider";
import { Result } from "@/components/analysis/live-analysis";
import { VhiSummary } from "@/components/questionnaire/vhi-questionnaire";

export function SessionRegistry({ view }: { view: "patients" | "history" }) {
  const { results, questionnaires, databaseConnected, databaseBusy, databaseError, loadFromDatabase } = useClinicalData();
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const selected = results.find(entry => entry.id === selectedId)?.result;
  const patients = Array.from(new Set([...results.map(entry => entry.result.user_id), ...questionnaires.map(entry => entry.subject_id)])).map(userId => ({
    userId,
    entries: results.filter(entry => entry.result.user_id === userId),
    vhiCount: questionnaires.filter(entry => entry.subject_id === userId).length,
  }));
  const selectedVhi = selectedUser ? questionnaires.find(entry => entry.subject_id === selectedUser) : undefined;
  const filteredPatients = patients.filter(({ userId }) => userId.includes(query.trim().toUpperCase()));
  const latest = results.reduce<string | null>((max, entry) => (max === null || entry.result.recording_timestamp > max ? entry.result.recording_timestamp : max), null);
  const visibleResults = view === "patients" ? results.filter(entry => entry.result.user_id === selectedUser) : results;

  return <div className={`registry-workspace registry-${view} flex min-w-0 flex-col gap-unit-md`}>
    <section className="registry-heading rounded bg-surface-container-lowest p-unit-lg shadow-sm">
      <div className="flex flex-wrap items-center gap-unit-sm"><h1 className="text-headline-lg text-primary">{view === "patients" ? "Patient Registry" : "Examination History"}</h1>{view === "patients" && <button type="button" disabled={!databaseConnected || databaseBusy} onClick={() => { setLoadError(""); void loadFromDatabase().catch(error => setLoadError(error instanceof Error ? error.message : "DB loading failed.")); }} className="rounded bg-primary-container px-3 py-1.5 text-body-sm font-medium text-white disabled:opacity-50">{databaseBusy ? "불러오는 중…" : "DB 불러오기"}</button>}</div>
      {(loadError || databaseError) && <p role="alert" className="mt-2 text-body-sm text-error">{loadError || databaseError}</p>}
    </section>
    {results.length > 0 && <dl className="summary-strip" aria-label="Registry summary"><div><dt>Subjects</dt><dd>{patients.length}</dd></div><div><dt>Recordings</dt><dd>{results.length}</dd></div><div><dt>Latest recording</dt><dd>{latest ? new Date(latest).toLocaleString("ko-KR") : "—"}</dd></div></dl>}
    {results.length === 0 && questionnaires.length === 0 ? <section className="rounded bg-surface-container-lowest p-unit-lg shadow-sm"><p className="text-body-sm text-on-surface-variant">아직 분석 결과가 없습니다.</p><Link href="/analysis" className="mt-unit-sm inline-block rounded bg-primary-container px-4 py-2 text-body-sm font-medium text-white">새 음성 분석</Link></section> : <>
      {view === "patients" && <section className="patient-list rounded bg-surface-container-lowest p-unit-lg shadow-sm"><h2 className="mb-unit-sm text-headline-sm text-primary">Subject IDs</h2><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Subject ID 검색" aria-label="Subject ID 검색" spellCheck={false} className="patient-search" />{filteredPatients.length === 0 && <p className="text-body-sm text-on-surface-variant" role="status">일치하는 Subject ID가 없습니다.</p>}<div className="grid gap-unit-sm md:grid-cols-2 xl:grid-cols-3">{filteredPatients.map(({ userId, entries, vhiCount }) => <button key={userId} type="button" onClick={() => { setSelectedUser(userId); setSelectedId(null); }} aria-pressed={selectedUser === userId} className={`rounded border p-unit-md text-left ${selectedUser === userId ? "border-secondary bg-surface-container-low" : "border-surface-container hover:bg-surface-container-low"}`}><span className="block font-data-md font-semibold text-primary">{userId}</span><span className="text-body-sm text-on-surface-variant">{entries.length} recording{entries.length === 1 ? "" : "s"}{vhiCount > 0 && ` · VHI ${vhiCount}`}</span></button>)}</div></section>}
      {view === "patients" && selectedVhi && !selected && <VhiSummary entry={selectedVhi} />}
      {(view === "history" || selectedUser) && <section className="recording-list rounded bg-surface-container-lowest p-unit-lg shadow-sm"><h2 className="mb-unit-sm text-headline-sm text-primary">Recordings</h2><div className="overflow-x-auto"><table className="w-full text-body-sm"><caption className="sr-only">Recordings and Voice Abnormality Score</caption><thead><tr className="border-b border-surface-container text-on-surface-variant"><th scope="col" className="p-2">Subject ID</th><th scope="col" className="p-2">Recording Time</th><th scope="col" className="p-2">Task</th><th scope="col" className="p-2">Voice Abnormality Score</th><th scope="col" className="p-2">Result</th></tr></thead><tbody>{visibleResults.map(({ id, result }) => <tr key={id} className="border-b border-surface-container"><td className="p-2 font-data-sm">{result.user_id}</td><td className="p-2">{new Date(result.recording_timestamp).toLocaleString("ko-KR")}</td><td className="p-2">{result.task.label}</td><td className="p-2 font-data-sm">{result.model.display_score.toFixed(1)} / 100</td><td className="p-2"><button type="button" onClick={() => setSelectedId(id)} aria-pressed={selectedId === id} className="rounded bg-surface-container-low px-3 py-1 font-medium text-primary hover:bg-surface-container">View analysis</button></td></tr>)}</tbody></table></div></section>}
      {selected && <Result result={selected} sessionId={selectedId ?? undefined} />}
    </>}
  </div>;
}
