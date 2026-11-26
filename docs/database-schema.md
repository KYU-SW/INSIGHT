# Realtime Database 스키마

프로젝트: `insight-95038` (asia-southeast1). 규칙: [`firebase.database.rules.json`](../firebase.database.rules.json) — 클라이언트 읽기·쓰기 전면 거부. Next.js 서버만 `.env.local`의 `FIREBASE_DATABASE_SECRET`(또는 `FIREBASE_SERVICE_ACCOUNT_PATH`)으로 접근합니다. 관리자 자격 증명은 규칙의 `.validate`를 우회하므로 아래 필드 검증은 `src/lib/firebase-database.ts`가 수행합니다.

```text
/
├── subjects/{subject_id}                 가명 피험자 (A-Z, 0-9, _, -; 최대 80자)
├── recordings/{recording_id}             녹음 메타데이터 (원본 음성 없음)       .indexOn subject_id
├── analyses/{analysis_id}                모델 출력 + 가중치/모델 카드 해시      .indexOn recording_id
├── acoustic_metrics/{analysis_id}        모델과 독립인 음향 지표
├── questionnaires/{questionnaire_id}     제출된 VHI-30 (서버 재계산 점수)      .indexOn subject_id
└── questionnaire_drafts/{subject_id}     작성 중인 VHI-30, 피험자당 1개; 제출 저장 시 삭제
```

```json
{
  "subjects": {
    "SUBJ_001": { "subject_id": "SUBJ_001", "created_at": "2026-11-26T02:00:00.000Z" }
  },
  "recordings": {
    "<uuid>": {
      "recording_id": "<uuid>", "subject_id": "SUBJ_001", "task_code": "vowel_a",
      "recorded_at": "2026-11-26T01:00:00.000Z", "uploaded_at": "2026-11-26T02:00:00.000Z",
      "duration_seconds": 3.0, "rms_dbfs": -17.07, "near_full_scale_percent": 0.0
    }
  },
  "analyses": {
    "<uuid>": {
      "analysis_id": "<uuid>", "recording_id": "<uuid>", "analyzed_at": "2026-11-26T02:00:00.000Z",
      "model_name": "MLP_MAX_h07", "model_score": 0.4281,
      "model_version": "sha256:<head.pt>", "head_sha256": "<64 hex>", "scaler_sha256": "<64 hex>",
      "model_card_sha256": "<64 hex>", "backbone_revision": "ece5fabbf034c1073acae96d5401b25be96709d8",
      "pipeline_version": "hubert-large-ls960-ft-ece5fabb-h07-max-standardscaler-mlp-v1",
      "ood_distance": 0.92, "ood_threshold": 1.7181, "ood_in_distribution": true,
      "status_reason": "No validated three-level cutoff was supplied"
    }
  },
  "acoustic_metrics": {
    "<analysis uuid>": {
      "analysis_id": "<uuid>", "mean_pitch_hz": 119.9, "pitch_sd_hz": 1.37, "pitch_cv": 0.0115,
      "intensity_cv": 0.105, "mean_intensity_dbfs": -17.07,
      "voice_quality_reason": "(선택) Jitter·Shimmer·HNR을 측정하지 못한 이유"
    }
  },
  "questionnaires": {
    "<uuid>": {
      "questionnaire_id": "<uuid>", "subject_id": "SUBJ_001", "instrument": "VHI-30",
      "instrument_version": "PhenX-English-source-Korean-translation", "usage_status": "development_translation",
      "completed_at": "2026-11-26T01:50:00.000Z", "uploaded_at": "2026-11-26T02:00:00.000Z",
      "answers": [0, 1, 2, "… 30개, 문항 1~30 순서"],
      "functional_score": 10, "physical_score": 20, "emotional_score": 30, "total_score": 60
    }
  },
  "questionnaire_drafts": {
    "SUBJ_001": {
      "subject_id": "SUBJ_001", "instrument_version": "PhenX-English-source-Korean-translation",
      "answers": { "1": 3, "2": 1 }, "current_index": 2, "updated_at": "2026-11-26T01:45:00.000Z"
    }
  }
}
```

| 규칙 | 이유 |
|---|---|
| 원본 음성·실명·등록번호 저장 안 함 | 가명 ID와 파생 지표만으로 결과 조회가 가능 |
| 측정 불가 지표(Jitter·Shimmer·HNR)는 필드 생략 | 값을 만들어 넣지 않음 |
| VHI 점수는 서버가 `answers`에서 재계산 | 클라이언트가 보낸 점수를 신뢰하지 않음 |
| 임시 저장 `answers`는 문항 번호를 키로 하는 객체 | RTDB는 배열의 `null`을 지워 인덱스가 밀리므로 응답한 문항만 키로 저장 |
| `analyses`에 `model_card_sha256` | 저장된 점수 → 가중치 → 학습 실행 증명(`model_card.json`)으로 추적 |
| `analyses`의 `ood_distance`·`ood_threshold`·`ood_in_distribution`·`status_reason`은 선택 필드 | 분석 당시 OOD 판정과 상태 사유를 보존해 다시 불러온 OOD 녹음도 경고가 유지됨. 세 OOD 필드가 모두 없는 이전 기록은 OOD 정보 없이(판정을 지어내지 않고) 로드 |
| `acoustic_metrics`의 `voice_quality_reason`은 선택 필드 | Jitter·Shimmer·HNR이 생략된 이유(DDK 과제, 유성음 부족 등)를 보존 |
