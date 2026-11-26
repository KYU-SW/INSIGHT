"use client";

import { useEffect, useState } from "react";
import type { ModelCard } from "@/lib/model-card";

type Evidence = { card: ModelCard; weightsMatchCard: boolean; mismatched: string[] };
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

/** Training/validation/test evidence for the deployed weights, from model_card.json (verified by SHA-256 on the server). */
export function ModelEvidence() {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/model-card", { cache: "no-store" }).then(response => (response.ok ? response.json() : Promise.reject()))
      .then(data => { if (active) setEvidence(data as Evidence); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  if (failed) return <p className="text-body-sm text-error">모델 근거(model_card.json)를 불러오지 못했습니다.</p>;
  if (!evidence) return null;
  const { card } = evidence;
  return <details className="model-evidence">
    <summary>모델 근거 · Model evidence — 내부 시험 {pct(card.test.accuracy)} (녹음 {card.data_split.recordings.test}개 / 피험자 {card.data_split.subjects.test}명){evidence.weightsMatchCard ? " · 가중치 SHA-256 일치" : " · ⚠ 가중치가 모델 카드와 다름"}</summary>
    {!evidence.weightsMatchCard && <p role="alert" className="text-error">배포된 {evidence.mismatched.join(", ")} 파일이 model_card.json과 다릅니다. 아래 수치는 현재 가중치의 성능이 아닙니다.</p>}
    <dl>
      <div><dt>분할 (피험자 단위 70/15/15)</dt><dd>train {card.data_split.subjects.train} · val {card.data_split.subjects.val} · test {card.data_split.subjects.test}명</dd></div>
      <div><dt>검증 (checkpoint 선택용)</dt><dd>{card.validation.val_ACC.toFixed(2)}% ({card.validation.correct_over_n}) · best epoch {card.validation.best_epoch}</dd></div>
      <div><dt>시험 (선택에 미사용)</dt><dd>민감도 {pct(card.test.sensitivity_ALS)} · 특이도 {pct(card.test.specificity_HC)} · 균형정확도 {pct(card.test.balanced_accuracy)}</dd></div>
      <div><dt>학습 실행 (증명됨)</dt><dd className="font-data-sm">{card.training_run.run_id} · head.pt sha256:{card.artifacts_sha256["head.pt"].slice(0, 12)}…</dd></div>
    </dl>
    <ul>{card.limitations.map(item => <li key={item}>{item}</li>)}</ul>
  </details>;
}
