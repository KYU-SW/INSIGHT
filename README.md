# INSIGHT

음성 기반 근위축성 측삭경화증(ALS) 조기 선별 보조 연구 프로토타입 · Early screening support for ALS through speech analysis

Next.js 16 / React 19 화면과 Python HuBERT 추론 서비스로 구성됩니다. 익명·시험 데이터 전용입니다. 출력은 **선별 보조 정보**이며 진단이 아닙니다.

| 무엇을 하나 | 어디서 확인하나 |
|---|---|
| VHI-30 자가보고 문진(모바일) + 음성 파일 AI 분석을 같은 가명 Subject ID로 결합 | `/questionnaire`, `/analysis`, `/patients` |
| 배포 가중치 ↔ 학습 설정·분할·검증·시험 결과 연결(SHA-256 검증) | [`model_card.json`](model_card.json), 결과 화면 "모델 근거" |
| 합성 음성으로 추론 결과 재현 | [`examples/`](examples/), `scripts/reproduce_inference.py` |
| Firebase 클라이언트 접근 전면 차단, 서버 전용 인증 | [`firebase.database.rules.json`](firebase.database.rules.json), `src/lib/firebase-auth.ts` |

---

## 1. 배경 및 필요성

### 근거

| 근거 | 확인된 내용 | 이 프로젝트에서의 의미 |
|---|---|---|
| Kim KH et al. *J Voice* 2016;30(2):246.e1-7 ([PMID 25985718](https://pubmed.ncbi.nlm.nih.gov/25985718/)) | 국민건강영양조사 2008–2011, 19세 이상 19,636명. 음성장애 유병률 **8.12%**(1,594명). 연령·성별·교육수준·건강상태와 연관 | 국내 성인에서 음성장애가 드물지 않음 |
| Roy N et al. *J Speech Lang Hear Res* 2004;47(2):281-93 ([PMID 15157130](https://pubmed.ncbi.nlm.nih.gov/15157130/)) | 무작위 표본 2,531명. 비교사 집단 현재 음성문제 **6.2%**, 평생 **28.8%**. 의사·언어치료사 상담 경험은 **5.5%** | 평생 경험에 비해 전문 상담 비율이 낮음 → 부담이 낮은 사전 선별 경로의 필요 |
| Cohen SM et al. *Laryngoscope* 2012;122(7):1589-94 ([PMID 22549455](https://pubmed.ncbi.nlm.nih.gov/22549455/)) | 단기장애 청구 18,466명 중 후두질환 386명(2.1%). 평균 결근 **39.2일**, 12개월 평균 임금손실 **$4,437.89** | 음성·후두 질환의 사회경제적 부담 |
| 건강보험심사평가원 [보건의료빅데이터개방시스템](https://opendata_visual.hira.or.kr/hbis/svcIntro.do), [질병정보서비스 Open API](https://www.data.go.kr/data/15119055/openapi.do) | KCD 코드별 성별·연령·입원/외래·요양기관 종별·지역별 진료 통계 제공 | 국내 통계의 1차 출처. 아래 R49 수치의 원자료 |
| [스탯노스 R49 음성장애](https://statnorth.kr/diseases/R49) (심평원 자료 2차 가공, 2025.12.31 기준) | 2025년 R49 진료인원 **2.6만 명**(2016년 대비 +38%), 요양급여비용 **33억 원**, 최다 연령대 60–69세(5,939명) | 국내 음성장애 진료 수요가 증가 추세 |

### 근거에서 결론까지의 논리

```text
음성장애는 흔함(8.12%)  ─┐
전문 상담률은 낮음(5.5%) ─┼─► 병원 방문 전, 부담이 낮은 음성 선별 경로가 필요
사회경제적 부담이 큼      ─┤
국내 진료 수요 증가(+38%) ─┘
        │
        ▼
INSIGHT: 스마트폰으로 녹음 파일 제출 → AI 음성이상점수 + 음향 지표 + VHI-30 자가보고를 한 화면에서 확인
```

**근거의 범위(중요).** 위 자료는 **음성장애 일반**의 유병률·부담·진료 규모입니다. ALS 특이적 조기진단 효과, 유병률, 또는 이 앱의 임상적 유용성을 입증하지 않습니다. ALS 연결은 학습 데이터(SAND Challenge Task 1의 ALS/HC 라벨)에 근거하며, R49는 증상 코드이므로 음성장애 전체 환자 수가 아닙니다. 심평원 시각화 포털은 2026-11-26 확인 시 TLS 인증서 오류로 직접 열리지 않았고, 수치는 위 2차 가공 페이지에서 인용했습니다.

### 왜 VHI-30과 AI 음성 분석을 결합하나

| | VHI-30 | AI 음성이상점수 · 음향 지표 |
|---|---|---|
| 측정 대상 | 환자가 **인식하는** 음성 장애의 기능·신체·정서적 영향 | 녹음 신호에서 추출한 표현(HuBERT)과 F0·강도 변동 |
| 성격 | 주관적 자가보고, 0–120점 | 객관적 신호 기반, 0–1 점수 |
| 한계 | 본인이 변화를 인지해야 점수에 반영 | 녹음 조건·분포 이동에 민감, 임상 기준값 없음 |

두 값은 서로 다른 구성개념을 측정하므로 **합산하지 않고 나란히** 보여줍니다(`src/components/analysis/live-analysis.tsx`). "AI 점수는 높은데 VHI는 낮은 불일치가 본인이 인지하기 전의 변화를 시사할 수 있다"는 것은 **검증되지 않은 가설**이며, 현재 데이터로 시험하지 않았습니다.

---

## 2. 시스템 구조

```text
[모바일/PC 브라우저]
  VHI-30 문진 (30문항, 0–4점)          음성 파일 선택 (WAV/FLAC/OGG; M4A·MP3는 브라우저에서 16 kHz WAV로 변환)
        │ 점수 계산(src/lib/vhi.ts)            │ XMLHttpRequest 업로드 진행률
        ▼                                      ▼
[Next.js 서버]  /api/database/questionnaires    /api/analyze ──► [FastAPI :8001] src/backend/app.py
  서버에서 VHI 점수 재계산                          decode → mono → 16 kHz → HuBERT-large(frozen) hidden_states[7]
  /api/model-card: head.pt·scaler.npz SHA-256 대조    → 시간축 max pooling(1024) → StandardScaler → MLP → sigmoid
        │                                           + F0(YIN)·강도 CV·dBFS (모델과 독립)
        ▼ 서비스 계정 OAuth 토큰 (서버 전용)
[Firebase Realtime DB]  subjects / recordings / analyses / acoustic_metrics / questionnaires
  클라이언트 직접 읽기·쓰기 전면 차단. 원본 음성은 저장하지 않음.
```

결과는 처음에는 브라우저 메모리에만 있습니다. DB 연동 후 사용자가 업로드를 선택해야 저장됩니다.

---

## 3. 모델 근거 (배포 가중치 ↔ 학습 결과)

[`model_card.json`](model_card.json)은 `scripts/build_model_card.py`가 저장소의 파일에서 **계산**합니다(수동 입력 없음). `--check`로 최신 여부를 확인합니다. 앱의 `/api/model-card`는 실행 중인 `head.pt`·`scaler.npz`의 SHA-256을 카드와 대조하고, 다르면 결과 화면에 경고합니다. DB의 `analyses` 레코드에는 `model_card_sha256`이 함께 저장됩니다.

| 항목 | 값 | 출처 |
|---|---|---|
| 데이터 | SAND Task 1 training sheet. Class 5 = HC, 1–4 = ALS. 271명, 2,164개 녹음 | 노트북 cell 4·7 출력 |
| 분할 | **피험자 단위** 층화 70/15/15, seed 42. train 189 / val 41 / test 41명 (녹음 1,510 / 326 / 328) | 노트북 cell 8 출력 |
| 특징 | frozen `facebook/hubert-large-ls960-ft` @ `ece5fabb`, hidden_states[7], 시간축 max pooling | `src/backend/model.py` |
| 학습 설정 | Adam, lr 5e-4, weight decay 1e-3, batch 64, BCE, 최소 val loss epoch 선택 | 노트북 cell 4·13 |
| 검증 | **73.31%** (239/326), best epoch 2 | `validation.json` = `history.csv` epoch 2 |
| 시험 (녹음 단위) | ACC **75.3%**, 민감도 **86.0%**, 특이도 **58.6%**, 균형정확도 72.3% | `test_confusion_counts.npy` [[75,53],[28,172]] |

**해석 범위와 확인된 불일치**

- 검증 73.31%는 checkpoint 선택에 사용된 값이므로 성능 추정치로 쓰지 않습니다. 시험 수치는 선택에 쓰지 않은 41명에서 나왔지만 **같은 SAND 분포·녹음 프로토콜 내부 시험**입니다. 스마트폰 녹음 등 배포 앱 입력에서의 성능이 아닙니다.
- 피험자당 평균 약 8개 녹음이므로 녹음 단위 지표는 유효 표본 수를 과대평가합니다. 특이도가 낮아(58.6%) 0.5 기준에서 위양성이 많습니다. 임상 운영 기준점은 검증되지 않았습니다.
- `history.csv`는 22 epoch인데 노트북은 `MAX_EPOCHS = 20`, `PATIENCE = 3`입니다. 노트북에 출력된 이 층의 val ACC는 72.09%로 `validation.json`(73.31%)과 다릅니다. 즉 제공된 가중치는 **노트북에 저장된 실행과 다른 실행**의 산출물로 보입니다. val 정답 수(239/326)와 시험 총수(328)는 노트북 분할과 정확히 맞지만, 학습 실행 ID가 저장되지 않아 연결은 "일관됨"이지 "증명됨"은 아닙니다. 이 실패한 검사들은 `model_card.json`의 `consistency_checks`에 `false`로 남겨 둡니다.
- 노트북의 검증 기반 층 선택은 MLP+max에서 HuBERT-5(h04)였으나, 배포 모델은 요청된 h07입니다.

---

## 4. 차별점과 기존 방법 대비

**모델 측면 (같은 분할·seed 내부 비교, 노트북 cell 19)** — 전역 평균(mean) pooling 대신 시간축 max pooling을 사용했습니다.

| Head | mean pooling 시험 ACC | max pooling 시험 ACC |
|---|---:|---:|
| MLP | 68.90% (HuBERT-5) | **78.35%** (HuBERT-5) |
| CNN | 71.65% (HuBERT-5) | **74.39%** (HuBERT-7) |

단일 seed·녹음 단위·한 데이터셋 결과이므로 "max pooling이 일반적으로 우수하다"는 결론은 아닙니다. 국소적 발성 이상이 평균에서 희석될 수 있다는 가설과 일치하는 관찰입니다.

**시스템 측면**

| 일반적인 데모 | INSIGHT |
|---|---|
| 모델 정확도를 README에 숫자로만 기재 | 배포 가중치 해시 ↔ 분할·검증·시험을 `model_card.json`으로 연결하고 런타임에 검증 |
| 측정하지 못한 지표를 기본값으로 표시 | Jitter·Shimmer·HNR·중증도 등급은 계산 근거가 없어 `null`/미분류로 표시 |
| 설문 점수를 클라이언트 값 그대로 저장 | 서버가 원 응답에서 VHI 점수를 재계산하고, 클라이언트가 보낸 점수는 무시 |
| 공개 DB 규칙 | 클라이언트 접근 전면 차단, 서버만 서비스 계정으로 접근 |
| 재현 수단 없음 | 결정론적 합성 음성 + 기대 출력 비교 스크립트 |

---

## 5. 빌드·추론 성능 (직접 실행, 2026-11-26)

환경: Intel Core i5-8279U 2.4 GHz, 16 GB, macOS, CPU 추론, Python 3.11.15, torch 2.2.2.

| 항목 | 결과 |
|---|---|
| `npm run lint` / `typecheck` | 통과 |
| `npm test` | **16/16 통과** (VHI 점수·문항 매핑, Firebase 인증·권한 거부, 모델 카드 해시 일치 등) |
| `npm run build` | 성공, **24.9 s** (15개 라우트) |
| HuBERT + head 로드 | 4.2–8.5 s (캐시 상태에 따라) |
| E2E `/api/analyze` (3 s 녹음) | 첫 요청 **8.8 s**(모델 로드 포함), 이후 **1.0–1.4 s** |
| 추론 시간 vs 녹음 길이 | 3 s → 0.97 s · 10 s → 3.1 s · 30 s → 13.3 s · 60 s → 41.3 s (중앙값, 3회) |
| 최대 메모리 (60 s 추론 포함) | 약 3.1 GB RSS |

추론 시간은 녹음 길이에 대해 초선형으로 증가합니다(Transformer self-attention). 서버 상한 120 s 녹음은 수 분이 걸릴 수 있어 짧은 과제 녹음(모음 연장 3–10 s)을 권장합니다. 동시 요청 처리량은 측정하지 않았습니다.

### 합성 음성 재현 예시

```sh
.venv/bin/python scripts/synthetic_voice.py          # examples/*.wav 재생성 (결정론적, SHA-256 동일)
.venv/bin/python scripts/reproduce_inference.py      # 기대 출력과 비교 → PASS / FAIL
```

| 파일 | 설계 | 모델 점수 | F0 SD | Intensity CV |
|---|---|---:|---:|---:|
| `synthetic_vowel_a_steady.wav` | F0 120 Hz 고정, 진폭 일정 | 0.999982 | 0.00 Hz | 0.074 |
| `synthetic_vowel_a_unstable.wav` | 주기별 F0 섭동 3%, 5 Hz 진폭 떨림, 잡음 | 0.999988 | 1.37 Hz | 0.105 |

음향 지표는 설계한 대로 두 신호를 구분합니다. 반면 **모델 점수는 두 합성 신호 모두 약 1.0으로 포화**됩니다. 합성 신호는 학습 분포 밖이며, 모델이 분포 밖 입력에도 확신에 찬 점수를 낸다는 관찰입니다. 이 예시는 파이프라인의 **결정성·재현성** 검증용이며 분류 성능의 근거가 아닙니다. 분포 밖 입력 탐지는 향후 과제입니다.

---

## 6. 실행

### 설치

```sh
cp .env.example .env.local   # FIREBASE_DATABASE_URL, FIREBASE_SERVICE_ACCOUNT_PATH 입력 (DB 기능 사용 시)
python3.11 -m pip install -r requirements-inference.txt
npm install
```

HuBERT 체크포인트, Python 패키지, 빌드 파일을 위해 2 GB 이상의 여유 공간이 필요합니다. 고정된 `facebook/hubert-large-ls960-ft` revision은 처음 실행할 때 `HF_HOME`에 내려받습니다.

### 실행 (터미널 2개)

```sh
HF_HOME=./hf-cache python3.11 -m uvicorn src.backend.app:app --host 127.0.0.1 --port 8001
npm run dev        # 또는 npm run build && npm start
```

`INFERENCE_API_URL`의 기본값은 `http://127.0.0.1:8001`입니다. 검증 명령은 `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `python scripts/build_model_card.py --check`, `python scripts/reproduce_inference.py`입니다.

### 화면

| 경로 | 내용 |
|---|---|
| `/questionnaire` | VHI-30 문진. 모바일에서 한 화면에 한 문항, 진행률, 이전/다음, 미응답 안내. PC에서는 숫자키 0–4로 응답 |
| `/analysis` (`/`) | Subject ID·과제·녹음 시각 입력 후 **기존 오디오 파일 업로드**(입력 방식 유지, 앱 내 녹음 없음) |
| `/patients` | Subject ID별 녹음 결과와 최신 VHI-30 결과. DB 불러오기 |
| `/history` | 전체 분석 이력 |

### 모바일 (PWA)

같은 Next.js 앱을 모바일에서 사용합니다. 760 px 이하에서 탭이 화면 폭에 맞춰지고 VHI 응답 버튼은 52 px 이상 세로 목록으로 바뀝니다. `manifest.ts`와 `/pwa-icon/[size]`로 홈 화면에 설치할 수 있습니다(Android Chrome: 앱 설치, iOS Safari: 공유 → 홈 화면에 추가). 서비스 워커와 오프라인 캐시가 없어 결과·음성·문진 응답이 기기에 저장되지 않습니다. 휴대폰 접속은 HTTPS가 필요합니다.

```sh
npm run build && npm start
cloudflared tunnel --url http://127.0.0.1:3000   # 또는 ngrok http 3000
```

터널 URL은 공개됩니다. Next.js API 경로(`/api/database/*`)에는 아직 사용자 인증이 없으므로, 터널 사용 중에는 DB 연동을 하지 말거나 시험 데이터만 사용하세요.

---

## 7. Realtime Database와 보안

- [`firebase.database.rules.json`](firebase.database.rules.json)은 모든 클라이언트 읽기·쓰기를 거부합니다. Firebase 콘솔에 적용하세요.
- Next.js 서버만 서비스 계정 키(`FIREBASE_SERVICE_ACCOUNT_PATH`, 저장소 밖에 보관, `.gitignore` 처리)로 RS256 JWT를 서명해 OAuth2 토큰을 받고, 모든 REST 요청에 붙입니다. 키가 없으면 공개 접근으로 대체하지 않고 거부합니다.
- 서비스 계정 접근은 규칙의 `.validate`를 우회하므로 필드 검증은 서버 코드(`src/lib/firebase-database.ts`)가 담당합니다. 필수 음향 값이 없으면 업로드를 막고 값을 만들어 넣지 않습니다.
- 저장 항목: 원 점수(0–1), `head.pt`·`scaler.npz`·`model_card.json` SHA-256, 파이프라인 ID, VHI 원 응답과 서버 재계산 점수. 원본 음성은 저장하지 않습니다.
- 남은 위험: 앱 사용자 로그인·권한 분리·감사 로그가 없고, 목록 조회는 전체 컬렉션을 읽습니다(대규모 코호트 전 페이지네이션 필요). **실제 환자 데이터에는 사용하지 마세요.**

---

## 8. 모델·지표 구현 세부

`head.pt`가 분류기 구조의 기준입니다: `Linear(1024,128)`, `ReLU`, `Linear(128,1)`(추론 모드에서 Dropout은 항등). 고정 체크포인트의 legacy positional convolution 텐서는 로드 전에 현재 Transformers 키로 매핑해 학습된 값을 유지합니다. 검증된 3단계 임상 기준값이 없어 `src/backend/interpretation.py`의 상태는 `null`(미분류)입니다. 녹음 길이, RMS dBFS, full-scale 근접 샘플 비율은 측정하지만 품질 등급은 추론하지 않습니다.

VHI-30 문항은 PhenX 영문판(PX201301; Jacobson et al., 1997) 기반 **개발용 한국어 번역**이며 공식 K-VHI 검증본이 아닙니다. 원문 번호와 기능(F)·신체(P)·정서(E) 영역을 유지합니다. 원문 PDF의 Mild/Moderate/Severe 기준값은 상호배타적 구간이 아니고 한국어판 타당도가 확인되지 않아, 총점과 영역별 점수만 표시합니다.

---

## 9. 기여 내역 (커밋 연결)

저장소 작성자(git author: 김성민)의 커밋입니다. 2026-11-16 이후 커밋은 Claude Code의 코드 작성 보조를 받았으며 커밋 메시지에 `Co-Authored-By`로 표기했습니다.

| 기능 / 차별점 | 커밋 |
|---|---|
| 초기 구현: Next.js 화면, FastAPI HuBERT 추론, 음향 지표, Firebase 업로드, PWA | [`ce9d62b`](https://github.com/KYU-SW/INSIGHT/commit/ce9d62b) |
| 결과 화면 위계·Registry 검색·접근성 개선 | [`2f9292d`](https://github.com/KYU-SW/INSIGHT/commit/2f9292d) |
| VHI-30 모바일 문진, 서버 점수 재계산, Subject ID 기반 음성 결과 결합 | [`42a1294`](https://github.com/KYU-SW/INSIGHT/commit/42a1294) |
| Firebase 클라이언트 접근 차단, 서버 전용 서비스 계정 인증 | [`c8a46aa`](https://github.com/KYU-SW/INSIGHT/commit/c8a46aa) |
| 배포 가중치 ↔ 학습 설정·분할·검증·시험 연결(`model_card.json`), 런타임 해시 검증 | [`fe11bbe`](https://github.com/KYU-SW/INSIGHT/commit/fe11bbe) |
| 합성 음성 재현 예시와 기대 출력 비교 | [`f71d9ac`](https://github.com/KYU-SW/INSIGHT/commit/f71d9ac) |

---

## 참고문헌

1. Kim KH, Kim RB, Hwang DU, Won SJ, Woo SH. Prevalence of and Sociodemographic Factors Related to Voice Disorders in South Korea. *J Voice*. 2016;30(2):246.e1-7. doi:10.1016/j.jvoice.2015.04.010
2. Roy N, Merrill RM, Thibeault S, Parsa RA, Gray SD, Smith EM. Prevalence of voice disorders in teachers and the general population. *J Speech Lang Hear Res*. 2004;47(2):281-93. doi:10.1044/1092-4388(2004/023)
3. Cohen SM, Kim J, Roy N, Asche C, Courey M. The impact of laryngeal disorders on work-related dysfunction. *Laryngoscope*. 2012;122(7):1589-94. doi:10.1002/lary.23197
4. Jacobson BH, Johnson A, Grywalski C, et al. The Voice Handicap Index (VHI): Development and Validation. *Am J Speech Lang Pathol*. 1997;6(3):66-70.
5. 건강보험심사평가원. 보건의료빅데이터개방시스템; 질병정보서비스 Open API (data.go.kr 15119055).
6. 스탯노스. 음성장애(R49) 환자 수·진료비 통계 (심평원 자료 가공, 2025.12.31 기준, 2026-11-26 확인).
