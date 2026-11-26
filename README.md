# INSIGHT

[![CI](https://github.com/KYU-SW/INSIGHT/actions/workflows/ci.yml/badge.svg)](https://github.com/KYU-SW/INSIGHT/actions/workflows/ci.yml)

음성 기반 근위축성 측삭경화증(ALS) 조기 선별 보조 연구 프로토타입 · Early screening support for ALS through speech analysis

진료 전에 스마트폰 녹음 파일과 VHI-30 자가보고 문진을 받아, ALS 관련 음성 이상 점수·음향 지표·문진 점수를 의료진 기록으로 전달하는 시스템이다. Next.js 16 / React 19 화면, Python HuBERT 추론 서비스, Firebase Realtime Database로 구성된다. 익명·시험 데이터 전용이며, 출력은 **의뢰 우선순위 판단을 돕는 선별 보조 정보**이고 진단이 아니다.

| 핵심 결과 | 근거 |
|---|---|
| 시험 41명(피험자 단위) AUROC **0.898** [0.783–0.980], 민감도 92.0%, 특이도 75.0% | §3, `model_card.json` |
| **구음장애가 없는 ALS(SAND Class 4) 10명 중 8명** 검출 | §3 |
| 배포 가중치가 특정 학습 실행에서 나왔음을 11개 검사로 증명 | §3, [`provenance/`](provenance/) |
| 같은 분할에서 9개 모델 구성 × 3 seed 비교: 더 복잡한 구성이 기준 모델보다 유의하게 낫지 않음 | §4 |
| VHI-30 모바일 문진(임시 저장·이어쓰기) + 음성 분석을 같은 가명 ID로 결합해 DB에 저장 | §2, §6 |

근거별 원문과 확인 방법은 [`docs/evidence-traceability.md`](docs/evidence-traceability.md)에 정리했다.

---

## 1. 배경 및 필요성

### 1.1 임상 문제: ALS는 확진까지 약 1년이 걸린다

- 증상 발현부터 확진까지 중앙값 **11.5개월**이며, 환자의 **52%**가 다른 진단을 먼저 받고 평균 **3명**의 의사를 거친다(304명) [R1].
- 21개 연구를 종합하면 통상 **10–16개월** [R2], 4개국 1,405명 코호트에서도 중앙값 **11개월**이다 [R3].
- 지연의 주원인은 질환이 드물고 증상이 이질적이어서 1차 진료에서 ALS를 떠올리기 어렵다는 점이다. 상용 바이오마커가 없으므로 ALS 가능성이 높은 환자를 골라 전문의에게 빨리 보내는 **선별·분류(triage) 도구**가 필요하다고 제시된다 [R4, R3].
- 국내 발생률은 10만 명당 연 **1.20명**, 유병률 **3.43명**(2015), 진단 시 평균 61.4세, 평균 생존 **50.0개월**이다 [R5]. 생존 기간이 짧아 1년의 진단 지연은 치료·다학제 진료·임상시험 참여 기회를 크게 줄인다 [R4].

### 1.2 현행 평가·사전문진의 한계

- 연수(bulbar) 기능 평가 도구는 많지만 각각 상당한 한계가 있다 [R6]. 기존 임상 도구는 **초기 변화에 민감하지 않다** [R8].
- 표준 기능평가 척도 ALSFRS-R은 주관적 평정 기반이라 미세한 변화를 놓칠 수 있다. 실제로 일부 음성 지표는 **ALSFRS-R 발화 점수가 변하지 않은 기간에도** 연수 기능 저하를 추적했다(278명) [R9].
- 조사한 상용 사전문진 시스템(Epic MyChart, Phreesia)은 문진·선별검사를 EHR로 보내지만, 공개 문서에서 **음성 신호 수집·분석 기능은 확인되지 않았다**(§5) [S1–S3]. 자가보고는 환자가 변화를 인지해야만 반영된다.

### 1.3 음성 기반 선별의 근거

- 연수 기능 저하는 ALS의 특징적 소견이며 생존과 삶의 질에 직접 영향을 준다 [R6]. 음성 저하는 연수 침범의 **가장 이른 증상 중 하나**다 [R7].
- 원격으로 자주 수집한 음성을 자동 분석하면 초기 음성 변화를 검출·추적할 수 있다(65명, 3–9개월) [R8].
- 발병 초기에 '어눌한 말'이 있던 환자는 진단까지 걸린 시간이 더 짧았다(p = 0.02) [R1]. 음성 변화가 인지되면 진단이 빨라진다는 관찰이며, 음성 변화를 더 일찍 객관적으로 포착하려는 동기가 된다.

### 1.4 문진과 음향 분석을 함께 쓰는 이유

| | VHI-30 자가보고 | AI 음성 점수 · 음향 지표 |
|---|---|---|
| 측정 대상 | 환자가 **인식하는** 음성 장애의 기능·신체·정서적 영향 [R12] | 녹음 신호의 표현(HuBERT)과 F0·강도 변동 |
| 장점 | 진료 맥락(생활 불편)을 구조화해 전달 | 본인이 인지하지 못한 변화도 반영 가능 [R9] |
| 한계 | 인지된 변화만 반영, ALS에서 검증된 도구가 아님 | 녹음 조건·분포 이동에 민감, 임상 기준값 없음 |

두 값은 서로 다른 구성개념이므로 **합산하지 않고 나란히** 보여준다. "AI 점수는 높고 VHI는 낮은 불일치가 인지 이전의 변화를 시사한다"는 것은 **검증되지 않은 가설**이다.

### 1.5 INSIGHT가 다루는 문제와 위치

| 단계 | 정의 | INSIGHT |
|---|---|---|
| 조기 선별 | 증상이 모호한 사람 중 추가 평가가 필요한 사람을 표시 | **해당** (연구 프로토타입) |
| 위험 평가 | 개인의 질환 확률을 보정된 값으로 제시 | 해당 안 됨 — 점수 보정·임상 기준점 미검증 |
| 진단 보조 | 의사의 감별진단에 근거 제공 | 해당 안 됨 — 임상 검증 없음 |
| 확정 진단 | El Escorial/Gold Coast 기준, 근전도 등 | 해당 안 됨 |

**적용 집단에 대한 제약.** 음성 증상은 성인의 8.12%가 겪을 만큼 흔하지만 [R10] ALS는 드물다 [R5]. 시험 성능(민감도 92%, 특이도 75%)을 그대로 가정하면 양성예측도(PPV)는 일반 인구(유병률 3.43/10만)에서 **0.013%**, 사전확률 5%인 의뢰 집단에서 16%, 20%에서 48%다. 따라서 INSIGHT는 **일반인 대상 선별이 아니라, 음성·연수 증상으로 내원한 환자 중 신경과 의뢰 우선순위를 정하는 용도**로 설계했다. (PPV는 시험 성능을 외삽한 계산이며 측정값이 아니다.)

### 1.6 기대 가치

진료 전 단계에서 음성과 문진을 함께 구조화해 기록으로 넘기면, 음성 변화가 있는 환자를 더 일찍 신경과 평가로 연결하는 데 쓸 수 있다. 정량적 기대효과는 §7에서 **실험으로 입증된 것 / 근거 기반 추정 / 미검증**으로 구분했다.

---

## 2. 시스템 구조

```text
[모바일/PC 브라우저]
  VHI-30 문진 (30문항, 0–4점)          음성 파일 선택 (WAV/FLAC/OGG; M4A·MP3는 브라우저에서 16 kHz WAV로 변환)
   │ 응답마다 임시 저장 (DB 연동 시)          │ XMLHttpRequest 업로드 진행률
   ▼                                          ▼
[Next.js 서버]                              /api/analyze ──► [FastAPI :8001] src/backend/app.py
  /api/database/questionnaire-drafts          decode → mono → (>8 kHz면 8 kHz로) → 16 kHz → HuBERT-large(frozen) hidden_states[7]
  /api/database/questionnaires (점수 재계산)  → 시간축 max pooling(1024) → StandardScaler → MLP → sigmoid
  /api/model-card (가중치 SHA-256 대조)      + F0(YIN)·강도 CV·dBFS (모델과 독립)
   │ 서버 전용 자격 증명 (.env.local)
   ▼
[Firebase Realtime DB]  subjects / recordings / analyses / acoustic_metrics / questionnaires / questionnaire_drafts
  클라이언트 읽기·쓰기 전면 거부 (401). 원본 음성은 저장하지 않음.
```

---

## 3. 배포 모델의 근거

### 3.1 배포 가중치 ↔ 학습 실행 증명

배포된 `head.pt`는 학습 실행 **`20261005T055211_070474Z`**의 `models/27074b1545/detection/MLP_max_h07/` 산출물이다. 근거 파일은 [`provenance/run_20261005T055211_070474Z/`](provenance/run_20261005T055211_070474Z/)에 있고, 원본 Drive 파일 ID와 SHA-256은 `drive_sources.json`에 있다. `scripts/build_model_card.py`가 아래 검사를 오프라인으로 다시 계산하며, 하나라도 실패하면 `model_card.json`을 만들지 않는다.

| # | 검사 | 결과 |
|---|---|---|
| 1 | 배포 `head.pt`·`scaler.npz`·`history.csv`·`validation.json`·`test_confusion_counts.npy`가 실행 폴더 원본과 바이트 단위 동일 | 통과 |
| 2 | `split_manifest.csv`로 split hash 재계산 = 실행 기록값, 피험자 중복 0 | 통과 |
| 3 | `history.csv` 22 epoch = best epoch 2 + patience 20 (실행 설정 max_epochs 100, lr 1e-3) | 통과 |
| 4 | `validation.json` = 실행의 MLP/max/h07 검증 행, h07은 MLP+max에서 검증 정확도로 선택된 층 | 통과 |
| 5 | 시험 예측 328개가 시험 분할과 정확히 일치하고 혼동행렬·시험 정확도 75.30% 재현 | 통과 |
| 6 | 배포 가중치를 실행의 HuBERT 특징 캐시에 적용하면 저장된 시험 확률 재현 (최대 차이 6×10⁻⁸) | 통과 |
| 7 | §4 비교 실행(`20261114T140021_240247Z_LOW_COST`)과 피험자→분할 매핑 동일 | 통과 |

앱의 `/api/model-card`는 실행 중인 가중치 해시를 카드와 대조해 결과 화면에 표시하고, 다르면 경고한다. DB `analyses` 레코드의 `model_card_sha256`으로 **저장된 점수 → 가중치 → 학습 실행**이 추적된다.

### 3.2 성능 (같은 분포 내부 시험)

| 항목 | 값 |
|---|---|
| 데이터 | SAND Task 1 training sheet [R11]: 이탈리아어 화자, 스마트폰 앱 녹음, 8 kHz. Class 5 = 건강군, 1–4 = ALS. 271명, 2,164개 녹음(모음 5개 + /pa/·/ta/·/ka/) |
| 분할 | **피험자 단위** 층화 70/15/15, seed 42. train 189 / val 41 / test 41명 (녹음 1,510 / 326 / 328) |
| 특징·분류기 | frozen `facebook/hubert-large-ls960-ft` @ `ece5fabb`, hidden_states[7], 시간축 max pooling → Linear(1024,128)–ReLU–Linear(128,1) |
| 학습 | Adam, lr 1e-3, batch 64, BCE, max 100 epoch, patience 20, 최소 val loss epoch |
| 시험 · 피험자 단위 (41명: HC 16, ALS 25) | **AUROC 0.898** [0.783–0.980], 정확도 85.4% [73.2–95.1], 민감도 **92.0%** [80.0–100], 특이도 **75.0%** [50.0–93.8] |
| 시험 · 녹음 단위 (328개) | 정확도 75.3% [68.3–81.4], 민감도 86.0% [77.5–93.0], 특이도 58.6% [46.9–69.5] |

[ ]는 95% 신뢰구간이다. 같은 사람의 녹음은 독립이 아니므로 **피험자를 재표본**했다(클래스 층화 cluster bootstrap 10,000회). 피험자 판정 규칙(피험자별 P(ALS) 평균 ≥ 0.5)은 평가 전에 고정했다.

**중증도별 민감도 (SAND Class, 피험자 단위)**

| SAND Class | 정의 [R11] | 시험 ALS | 검출 |
|---|---|---:|---:|
| 1 | 중증 구음장애 | 1 | 1 |
| 2 | 중등도 구음장애 | 5 | 5 |
| 3 | 경도 구음장애 | 9 | 9 |
| **4** | **구음장애 없음** | **10** | **8 (80%)** |

구음장애로 평정되지 않은 ALS 환자에서도 10명 중 8명을 검출했다. 조기 선별 가능성을 지지하는 관찰이지만 n = 10이라 불확실성이 크다.

**해석 범위.** 같은 SAND 분포·녹음 프로토콜 내부의 결과이며, 다른 언어·마이크·인구 집단에서의 성능이 아니다. HC가 16명뿐이라 특이도 구간이 넓다. 학습 음성은 모두 8 kHz이므로 `decode_audio`는 8 kHz를 넘는 입력을 학습과 같은 대역으로 낮춘다(8 kHz 입력은 학습 경로와 비트 단위 동일, 자동 테스트로 확인). 스마트폰 고음질 녹음에서의 실제 성능 변화는 측정하지 못했다.

---

## 4. 모델 선택 근거: 같은 분할에서의 비교 실험

배포 모델과 **같은 피험자 분할**(§3.1 검사 7)에서 수행한 비교 실험 `HUBERT_ALS_7EXP_HPO/20261114T140021_240247Z_LOW_COST`의 원본 결과다([`provenance/run_20261114T140021_240247Z_LOW_COST/`](provenance/run_20261114T140021_240247Z_LOW_COST/)). 기준 모델(BASE)은 HuBERT-5(h04) max pooling + MLP이며, 각 구성은 검증 AUROC로 하이퍼파라미터를 고른 뒤(HPO seed와 분리된) 3개 seed(42·43·44)로 재학습하고 시험은 1회만 평가했다.

| 구성 | 변경한 축 | 시험 AUROC (seed 앙상블, 95% CI) | seed별 AUROC 평균 ± SD | 추론 ms/녹음 |
|---|---|---|---|---:|
| BASE01 HuBERT-5 max + MLP | — | 0.893 [0.773–0.983] | 0.895 ± 0.003 | 0.03 |
| EXP01 층 가중합 | 표현 깊이 | 0.900 [0.790–0.980] | 0.888 ± 0.009 | 0.04 |
| EXP02 attentive statistics pooling | 시간 집계 | 0.843 [0.705–0.945] | 0.828 ± 0.028 | 2.09 |
| EXP03 HuBERT + eGeMAPS gated fusion | 수기 음향 특징 결합 | 0.890 [0.763–0.985] | 0.890 ± 0.003 | 0.04 |
| EXP04 focal loss | 목적함수 | 0.895 [0.775–0.983] | 0.890 ± 0.004 | 0.03 |
| EXP05 피험자 단위 MIL | 피험자 집계 | 0.903 [0.783–0.993] | 0.897 ± 0.016 | 0.39 |
| EXP06 latent SpecAugment | 정규화 | 0.890 [0.765–0.980] | 0.887 ± 0.004 | 1.96 |
| EXP07 LoRA (HuBERT 1–4층) | 인코더 미세조정 | 0.840 [0.705–0.945] | 0.835 ± 0.011 | 43.7 |
| **배포 모델** (실행 A, h07 max + MLP) | — | **0.898 [0.783–0.980]** (단일 모델) | — | — |

**관찰.** 기준 모델 대비 paired bootstrap에서 AUROC 차이의 95% CI가 0을 벗어난 구성은 없었다. 균형정확도는 EXP02(−0.131), EXP03(−0.125), EXP07(−0.160)이 보정 전 기준 모델보다 낮았으나 Holm 보정 후 유의하지 않았다(p = 0.21, 0.10, 0.098). seed 간 AUROC 표준편차는 기준 모델 0.003으로 작다.

**해석.** 학습형 attentive pooling, 수기 음향 특징(eGeMAPS) 결합, 인코더 미세조정 등 더 복잡한 대안이 이 데이터에서는 단순한 max pooling + MLP보다 낫지 않았다. 배포 모델의 AUROC도 비교 기준 모델 범위 안에 있다. 그래서 추론 비용이 가장 낮은 단순 구조(녹음당 0.03 ms, 인코더 제외)를 배포 대상으로 택했다. "max pooling이 일반적으로 우수하다"는 결론은 아니다. 41명 시험에서 차이를 검출할 검정력이 부족하다. 배포 모델은 0.5 기준을, 비교 실험은 검증 Youden 기준을 써서 민감도·특이도는 직접 비교하지 않고 임계값과 무관한 AUROC만 비교했다.

---

## 5. 기존 사전문진·음성 선별 시스템과의 비교

공식 문서·등록 페이지 원문으로 확인한 내용만 적었다. 공개 자료로 확인하지 못한 기능은 "미지원"이 아니라 "공개 자료 미확인"으로 표기했다.

| 시스템 | 진료 전 문진 | 음성 기반 조기 선별 | EMR 연동 | 근거 |
|---|---|---|---|---|
| Epic MyChart (eCheck-In) | **지원** — 진료 전 eCheck-In에서 문진 응답; 질환 특이 문항은 기관별 구성 | 공개 자료 미확인 | **지원** — Epic EHR의 환자 포털(“MyChart 정보는 의료기록에서 직접 온다”); 문진 응답의 차트 저장 방식은 기관 설정에 따름(공개 문서 미확인) | [S1] |
| Phreesia | **지원** — 등록·선별검사, PRO 자동 채점, 위험 표시 | 공개 자료 미확인 (공개 문서의 “Voice”는 전화 응대 기능) | **지원** — Epic 등 다수 EHR, HL7·FHIR·CCD 양방향, 결과·선별검사를 EHR로 전송 | [S2, S3] |
| Canary Speech (인지건강 모델) | 공개 자료 미확인 | **지원** — 40초 이상 음성을 AI로 분석(인지 기능 대상, ALS 아님) | **부분** — 호환 EHR로 Epic·Oracle Health·Meditech 표기, 연동 방식·차트 기록 여부 미공개 | [S4] |
| Aural Analytics Speech Vitals | 공개 자료 미확인 | **연구용** — 임상연구 참여자 전용 음성 수집·분석, ALS 연구에 사용 [R8] | 공개 자료 미확인 | [S5, R8] |
| **INSIGHT** | **지원** — VHI-30(30문항, F/P/E), 서버 점수 재계산, 임시 저장·이어쓰기 | **프로토타입** — ALS 대상 HuBERT 분류 + F0·강도 지표, 내부 시험 AUROC 0.898 | **프로토타입** — 자체 DB(Firebase)에 문진·음성 결과를 같은 가명 ID로 저장·조회; 병원 EMR(HL7/FHIR) 연동은 **미구현** | 저장소 코드 |

**INSIGHT의 차별점과 구현 상태**

| 차별점 | 기존 시스템의 공백 | 상태 |
|---|---|---|
| 한 흐름에서 문진과 음성 선별을 함께 수집 | 조사한 문진 시스템의 공개 문서에 음성 기능이 없고, 음성 바이오마커 도구는 문진 기능이 공개되지 않음 | **구현** (`/questionnaire`, `/analysis`) |
| ALS 대상 음성 선별 | 공개된 상용 음성 모델은 인지·정신 건강 대상, ALS 음성 도구는 연구용 | **구현** (내부 시험만, 임상 검증 없음) |
| 문진·음성 결과를 같은 피험자 기록으로 결합 | — | **구현** (자체 DB, `docs/database-schema.md`) |
| 저장된 점수에서 학습 실행까지 추적 | 공개 자료에서 확인되지 않음 | **구현** (`model_card_sha256`) |
| 병원 EMR로 결과 전송 | Epic·Phreesia는 운영 수준 지원 | **미구현** — FHIR `QuestionnaireResponse`/`Observation` 변환은 향후 과제 |

INSIGHT가 기존 시스템보다 우수하다는 주장이 아니다. 운영 시스템들이 가진 EMR 연동·대규모 운영 검증은 INSIGHT에 없다. 차이는 **ALS 음성 선별과 문진을 진료 전 한 흐름으로 묶었다**는 기능 조합에 있다.

---

## 6. 사용 화면과 실행

| 경로 | 내용 |
|---|---|
| `/questionnaire` | VHI-30 문진. 모바일에서 한 화면에 한 문항, 진행률, 이전/다음, 미응답 안내. DB 연동 시 응답마다 임시 저장, 같은 ID로 재시작하면 이어서 작성 |
| `/analysis` (`/`) | Subject ID·과제·녹음 시각 입력 후 **기존 오디오 파일 업로드**(앱 내 녹음 없음) |
| `/patients` | Subject ID별 녹음 결과와 최신 VHI-30 결과. DB 불러오기 |
| `/history` | 전체 분석 이력 |

| 문항 화면 | 결과 화면 |
|---|---|
| ![VHI-30 mobile question](docs/ui-verification/vhi-mobile-question.png) | ![VHI-30 mobile result](docs/ui-verification/vhi-mobile-result.png) |

```sh
python3.11 -m pip install -r requirements-inference.txt
npm install
cp .env.example .env.local     # FIREBASE_DATABASE_URL과 서버 자격 증명 입력 (DB 기능 사용 시)

HF_HOME=./hf-cache python3.11 -m uvicorn src.backend.app:app --host 127.0.0.1 --port 8001   # 터미널 1
npm run dev                                                                                  # 터미널 2
```

HuBERT 체크포인트·패키지·빌드 파일에 2 GB 이상이 필요하다. 모바일은 PWA로 홈 화면 설치가 가능하며, 기기에는 아무것도 저장하지 않는다. 휴대폰 접속에는 HTTPS가 필요하다(`npm run build && npm start` 후 `cloudflared tunnel --url http://127.0.0.1:3000`). 터널 URL은 공개되므로 시험 데이터만 사용한다.

---

## 7. 기대효과

| 구분 | 내용 | 근거 · 가정 |
|---|---|---|
| **실험으로 입증** | 내부 시험 41명에서 피험자 단위 AUROC 0.898 [0.783–0.980], 민감도 92.0%, 특이도 75.0% | §3.2, 같은 SAND 분포 |
| | 구음장애가 평정되지 않은 ALS(Class 4) 10명 중 8명 검출 | §3.2, n = 10 |
| | 더 복잡한 8개 대안 대비 성능 저하 없이 추론 비용이 가장 낮은 구조 선택 (seed 간 AUROC SD 0.003) | §4 |
| | 3초 녹음 기준 서버 응답 1.0–1.4 s(CPU), 문진·음성 결과의 DB 저장·재조회 E2E 통과 | §8 |
| **근거 기반 추정** | 사전확률 5–20%의 증상 내원 집단에서 PPV 16–48% — 일반 인구(0.013%)가 아닌 의뢰 집단에서만 유용 | §1.5 계산; 시험 성능이 외부 집단에 그대로 적용된다는 가정 |
| | 음성 변화가 있는 환자를 진료 전에 표시해 신경과 의뢰를 앞당길 수 있음 | 진단 지연 중앙값 11–11.5개월 [R1, R3], 말 증상과 빠른 진단의 연관 [R1]; 지연 단축 폭은 추정하지 않음 |
| **미검증** | 실제 진단 지연 단축, 의료진 업무 시간 절감, 문진 작성 시간, 스마트폰 고음질 녹음·한국어 화자에서의 성능 | 측정 자료 없음 |

---

## 8. 검증과 성능 (직접 실행, 2026-11-26)

환경: Intel Core i5-8279U 2.4 GHz, 16 GB, macOS, CPU 추론, Python 3.11.15, torch 2.2.2.

| 항목 | 결과 |
|---|---|
| `npm run lint` / `typecheck` / `npm test` | 통과, TypeScript 테스트 **18/18** |
| Python 백엔드 테스트 (`python -m unittest discover -s tests/python`) | **12/12** (8 kHz 경로 동일성, 대역 제한, F0·dBFS, 미측정 지표 `null`, 상태 기준값 검증, API 계약) |
| 가중치 증명 (`scripts/build_model_card.py --check`) | 11개 검사 통과 |
| 합성 음성 재현 (`scripts/reproduce_inference.py`) | PASS |
| `npm run build` | 성공, 24.9 s |
| CI (GitHub Actions `ci.yml`) | `web`: lint·typecheck·test·build / `model`: Python 테스트·가중치 증명·합성 음성 재현 |
| E2E `/api/analyze` (3 s 녹음) | 첫 요청 8.8 s(모델 로드 포함), 이후 **1.0–1.4 s** |
| 추론 시간 vs 녹음 길이 | 3 s → 0.97 s · 10 s → 3.1 s · 30 s → 13.3 s · 60 s → 41.3 s (초선형, self-attention) |
| 최대 메모리 | 약 3.1 GB RSS |
| 실제 DB E2E | 연결 → 결과 업로드 → 문진 임시 저장·복원 → 제출 시 임시본 삭제 → 재조회 통과 |
| 모바일 (Comet, 390×844) | 가로 스크롤 없음, 임시 저장 → 새 세션 복원 → 30문항 완료 확인 |

**합성 음성 재현 예시.** `examples/`의 결정론적 합성 /a/ 두 개(안정/불안정)는 음향 지표(F0 SD 0.00 vs 1.37 Hz)로 설계대로 구분되지만, 모델 점수는 둘 다 약 1.0으로 포화된다. 포화 원인이 학습–입력 대역폭 차이라는 가설을 [`experiments/bandwidth_8k.py`](experiments/bandwidth_8k.py)로 시험했으나 **기각**되었다(대역을 맞춰도 8개 입력 모두 0.9999대). 이 예시는 파이프라인 결정성 검증용이다.

---

## 9. 기술적 한계와 남은 과제

| 항목 | 현재 상태 | 근거 · 다음 단계 |
|---|---|---|
| 분포 밖 입력 | 미해결 — 합성음에서 점수 포화, 입력 품질 게이트 없음 | 학습 특징 분포 기반 OOD 점수(예: Mahalanobis) 도입 실험 필요 |
| Jitter·Shimmer·HNR | 미구현(`null`) | Praat 기반 측정은 지속 모음 프로토콜·Parselmouth 의존성 추가가 필요 |
| 외부 기준 모델 | 부분 — eGeMAPS는 HuBERT와의 결합(EXP03)으로만 비교 | eGeMAPS 단독 + SVM 같은 수기 특징 단독 기준은 SAND 원본 음성으로 재학습 필요 |
| 검정력 | 시험 41명(HC 16) | 외부 코호트·더 많은 대조군 필요; 교차검증은 미수행 |
| 언어·녹음 조건 | 이탈리아어, 8 kHz 스마트폰 앱 | 한국어 화자·고음질 녹음 검증 필요 |
| 점수 해석 | 상태 미분류, 보정 없음 | 의뢰 집단에서 운영 기준점·보정 검증 필요 |
| EMR 연동 | 자체 DB만 | FHIR 변환·병원 연동 미구현 |
| API 인증 | 미구현 — Next.js API에 사용자 인증 없음, DB 규칙은 전면 차단 | 인증 체계 선택은 아키텍처 결정이 필요 |
| DB 자격 증명 | 레거시 Database Secret 사용(서비스 계정도 지원) | 운영 전 서비스 계정으로 전환 권장 |
| LICENSE | 없음 | 라이선스 선택은 저장소 소유자 결정 사항 |

---

## 10. Realtime Database와 보안

- 구조와 필드: [`docs/database-schema.md`](docs/database-schema.md). 규칙 [`firebase.database.rules.json`](firebase.database.rules.json)은 모든 클라이언트 읽기·쓰기를 거부한다(비인증 요청 401 확인).
- Next.js 서버만 `.env.local`의 자격 증명(`FIREBASE_DATABASE_SECRET` 또는 `FIREBASE_SERVICE_ACCOUNT_PATH`)으로 접근한다. 자격 증명이 없으면 공개 접근으로 대체하지 않고 거부한다.
- 관리자 자격 증명은 규칙의 `.validate`를 우회하므로 필드 검증은 서버 코드가 담당한다. 필수 음향 값이 없으면 업로드를 막고 값을 만들어 넣지 않는다. 원본 음성은 저장하지 않는다.
- **실제 환자 데이터에는 사용하지 않는다.**

## 11. 구현 세부

`head.pt`가 분류기 구조의 기준이다. 고정 체크포인트의 legacy positional convolution 텐서는 로드 전에 현재 Transformers 키로 매핑해 학습된 값을 유지한다. 검증된 임상 기준값이 없어 `src/backend/interpretation.py`의 상태는 `null`(미분류)이다. VHI-30 문항은 PhenX 영문판(PX201301) 기반 **개발용 한국어 번역**이며 공식 K-VHI 검증본이 아니다. 원문 번호와 F/P/E 영역을 유지하고, 한국어판 기준값이 없어 총점과 영역별 점수만 표시한다.

---

## 12. 개인 기여

저장소 작성자가 문제를 정의하고, 실험과 시스템을 설계·주도·검증했다. 아래는 저장소와 연구 기록으로 확인할 수 있는 범위다.

| 영역 | 기여 내용 | 확인 근거 |
|---|---|---|
| 문제 정의·기획 | ALS 진단 지연과 연수 증상의 조기 포착을 진료 전 음성 선별 문제로 정의, 선별 보조로 범위 설정 | §1, 초기 커밋 `ce9d62b` |
| 연구 방법론·실험 설계 | 피험자 단위 층화 분할, 검증 기반 층·하이퍼파라미터 선택, 시험 1회 평가, HPO seed와 평가 seed 분리, paired bootstrap·Holm 보정 비교 | `provenance/*/run_config.json`, `ALS_HC_7EXP_HPO_Research_Pipeline.ipynb`, `HuBERT_Frozen_CNN_Pooling_Reproduction (2).ipynb` |
| 모델 선택·비교 실험 | HuBERT 25개 층 × pooling 3종 × head 2종(150개) 탐색, 9개 구성 × 3 seed 비교 후 비용 대비 성능으로 배포 모델 결정 | `provenance/run_20261005T055211_070474Z/validation_all_layers.csv`, `provenance/run_20261114T140021_240247Z_LOW_COST/` |
| 데이터 전처리·평가 방법 | 학습 8 kHz 대역과 추론 전처리 일치, 녹음·피험자 단위 지표 분리, cluster bootstrap, 중증도별 민감도 | `src/backend/model.py`, `scripts/build_model_card.py` |
| 시스템 아키텍처·통합 | 브라우저 ↔ Next.js ↔ FastAPI 추론 ↔ Firebase 데이터 흐름 설계, 문진·음성 결과의 가명 ID 결합 | §2, `src/` |
| 임상 워크플로 설계 | 진료 전 모바일 문진 → 음성 제출 → 의료진 Registry 조회, 문진 임시 저장, 미측정 지표의 비표시 원칙 | `/questionnaire`, `/patients` |
| 검증·신뢰성 | 가중치 출처 11개 검사, 합성 음성 재현, Python·TypeScript 자동 테스트, CI, 실제 DB·모바일 E2E, 부정 결과(대역폭 가설) 기록 | §3, §8, `.github/workflows/ci.yml` |
| 배포·보안 | DB 클라이언트 접근 차단, 서버 전용 인증, 원본 음성 미저장 | §10 |

| 기능 / 차별점 | 커밋 |
|---|---|
| 초기 구현: Next.js 화면, FastAPI HuBERT 추론, 음향 지표, Firebase 업로드, PWA | [`ce9d62b`](https://github.com/KYU-SW/INSIGHT/commit/ce9d62b) |
| 결과 화면 위계·Registry 검색·접근성 개선 | [`2f9292d`](https://github.com/KYU-SW/INSIGHT/commit/2f9292d) |
| VHI-30 모바일 문진, 서버 점수 재계산, Subject ID 기반 결합 | [`42a1294`](https://github.com/KYU-SW/INSIGHT/commit/42a1294) |
| Firebase 클라이언트 접근 차단, 서버 전용 인증 | [`c8a46aa`](https://github.com/KYU-SW/INSIGHT/commit/c8a46aa) |
| 모델 카드와 런타임 가중치 해시 검증 | [`fe11bbe`](https://github.com/KYU-SW/INSIGHT/commit/fe11bbe) |
| 합성 음성 재현 예시 | [`f71d9ac`](https://github.com/KYU-SW/INSIGHT/commit/f71d9ac) |
| 배포 가중치 ↔ 학습 실행 증명 | [`35b7c72`](https://github.com/KYU-SW/INSIGHT/commit/35b7c72) |
| 실제 DB 연결, VHI-30 임시 저장·이어쓰기, 모바일 검증 | [`0684d26`](https://github.com/KYU-SW/INSIGHT/commit/0684d26) |
| 학습–추론 대역폭 일치와 포화 원인 실험 | [`68b5878`](https://github.com/KYU-SW/INSIGHT/commit/68b5878) |
| 피험자 단위 지표와 cluster bootstrap 신뢰구간 | [`a2b0f1c`](https://github.com/KYU-SW/INSIGHT/commit/a2b0f1c) |
| CI: 웹 검사 + 모델 증명·재현 자동화 | [`f3d4037`](https://github.com/KYU-SW/INSIGHT/commit/f3d4037) |
| Python 백엔드 자동 테스트 12개, CI 포함 | [`2c92ea8`](https://github.com/KYU-SW/INSIGHT/commit/2c92ea8) |
| 피험자 AUROC·중증도별 민감도, 같은 분할 비교 실험(9구성 × 3 seed) 근거 연결 | [`2b82825`](https://github.com/KYU-SW/INSIGHT/commit/2b82825) |

---

## 참고문헌

전체 서지와 각 주장의 확인 방법은 [`docs/evidence-traceability.md`](docs/evidence-traceability.md)에 있다.

- [R1] Paganoni S et al. *Amyotroph Lateral Scler Frontotemporal Degener*. 2014;15:453-6. doi:10.3109/21678421.2014.903974
- [R2] Richards D, Morren JA, Pioro EP. *J Neurol Sci*. 2020;417:117054. doi:10.1016/j.jns.2020.117054
- [R3] Falcão de Campos C et al. *Front Neurol*. 2023;13:1064619. doi:10.3389/fneur.2022.1064619
- [R4] Gwathmey KG et al. *Eur J Neurol*. 2023;30(9):2595-2601. doi:10.1111/ene.15874
- [R5] Jun KY et al. *J Neurol Neurosurg Psychiatry*. 2019;90(4):395-403. doi:10.1136/jnnp-2018-318974
- [R6] Yunusova Y et al. *Front Neurol*. 2019;10:106. doi:10.3389/fneur.2019.00106
- [R7] Tena A et al. *JMIR Med Inform*. 2021;9(3):e21331. doi:10.2196/21331
- [R8] Stegmann GM et al. *NPJ Digit Med*. 2020;3:132. doi:10.1038/s41746-020-00335-x
- [R9] Neumann M, Kothare H, Ramanarayanan V. *Comput Biol Med*. 2024;180:108949. doi:10.1016/j.compbiomed.2024.108949
- [R10] Kim KH et al. *J Voice*. 2016;30(2):246.e1-7. doi:10.1016/j.jvoice.2015.04.010
- [R11] Sannino G et al. SAND Challenge. *IEEE Open J Signal Process*. 2026;7:766-775. doi:10.1109/OJSP.2026.3713044; https://www.sand.icar.cnr.it/
- [R12] Jacobson BH et al. *Am J Speech Lang Pathol*. 1997;6(3):66-70; PhenX Toolkit PX201301
- [S1] Epic MyChart Help · [S2] Phreesia Platform · [S3] Phreesia Intake Forms · [S4] CHAI Registry: Canary Speech · [S5] App Store: Speech Vitals — URL은 추적표 참조
