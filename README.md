<div align="center">

# INSIGHT

**음성으로 근위축성 측삭경화증(ALS)을 조기에 선별하도록 돕는 연구 프로토타입**<br>
Early screening support for ALS through speech analysis

[![CI](https://github.com/KYU-SW/INSIGHT/actions/workflows/ci.yml/badge.svg)](https://github.com/KYU-SW/INSIGHT/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![Model](https://img.shields.io/badge/Model-HuBERT--large%20%2B%20MLP-orange)

[빠른 시작](#빠른-시작) · [사용 방법](#사용-방법) · [API](#api) · [문제 해결](#문제-해결) · [FAQ](#자주-묻는-질문) · [연구 근거](#1-배경-및-필요성)

</div>

> [!WARNING]
> INSIGHT는 **진단 도구가 아닙니다.** 출력은 신경과 의뢰 우선순위 판단을 돕는 **선별 보조 정보**이며, 임상 검증을 거치지 않았습니다. 익명·시험 데이터에만 사용하세요. 실제 환자 데이터에는 사용하지 않습니다.

진료 전에 환자가 스마트폰으로 **VHI-30 음성장애 문진**에 답하고 **음성 녹음 파일**을 제출하면, INSIGHT는 다음 세 가지를 같은 가명 ID로 묶어 의료진 화면에 전달합니다.

1. **AI 음성 이상 점수**: HuBERT-large 음성 표현과 MLP 분류기로 계산합니다.
2. **음향 지표**: F0, Jitter, Shimmer, HNR, 강도 변동 등이며, 모델과 독립적으로 측정합니다.
3. **문진 점수**: VHI-30의 기능·신체·정서 영역 점수입니다.

<div align="center">

![분석 결과 화면](docs/ui-verification/insight-analysis-desktop.png)

<sub>합성 음성(`examples/synthetic_vowel_a_unstable.wav`)을 실제로 분석한 화면이다. 합성음은 학습 분포 밖의 입력이므로, 점수는 표시하되 해석을 막는 **OOD 경고**가 함께 뜬다.</sub>

</div>

---

## 목차

- [한눈에 보기](#한눈에-보기) · [평가 기준별 근거 위치](#평가-기준별-근거-위치)
- [어떻게 동작하나요](#어떻게-동작하나요)
- [빠른 시작](#빠른-시작)
- [사용 방법](#사용-방법)
- [API](#api)
- [프로젝트 구조](#프로젝트-구조)
- [테스트와 재현](#테스트와-재현)
- [문제 해결](#문제-해결)
- [자주 묻는 질문](#자주-묻는-질문)
- 연구·설계 문서
  - [1. 배경 및 필요성](#1-배경-및-필요성) · [2. 시스템 구조](#2-시스템-구조) · [3. 배포 모델의 근거](#3-배포-모델의-근거) · [4. 모델 선택 근거](#4-모델-선택-근거-같은-분할에서의-비교-실험)
  - [5. 기존 시스템과의 비교](#5-기존-사전문진음성-선별-시스템과의-비교) · [6. 화면 구성](#6-화면-구성) · [7. 기대효과](#7-기대효과) · [8. 검증과 성능](#8-검증과-성능-직접-실행-2026-11-26)
  - [9. 한계와 남은 과제](#9-기술적-한계와-남은-과제) · [10. DB와 보안](#10-realtime-database와-보안) · [11. 구현 세부](#11-구현-세부) · [12. 개인 기여](#12-개인-기여) · [참고문헌](#참고문헌)

---

## 한눈에 보기

| 핵심 결과 | 값 | 자세히 |
|---|---|---|
| 내부 시험 성능 (41명, 피험자 단위) | AUROC **0.898** [0.783–0.980] · 민감도 **92.0%** · 특이도 **75.0%** | [§3.2](#32-성능-같은-분포-내부-시험) |
| 구음장애가 없는 초기 ALS(SAND Class 4) | 10명 중 **8명** 검출 | [§3.2](#32-성능-같은-분포-내부-시험) |
| 배포 가중치의 출처 증명 | 특정 학습 실행에서 나왔음을 **11개 검사**로 재계산 | [§3.1](#31-배포-가중치--학습-실행-증명) |
| 모델 선택 근거 | 같은 분할에서 9개 구성 × 3 seed 비교. 더 복잡한 구성이 유의하게 낫지 않아 가장 가벼운 구조를 택함 | [§4](#4-모델-선택-근거-같은-분할에서의-비교-실험) |
| 실험 규모 | 층 탐색 300회, 특징 결합 60회, 비교 실험 27회 + HPO 88 trial | [§4.2](#42-설계-결정의-실험-근거) |
| 자동 검증 | Python 테스트 33개, TypeScript 테스트 24개, 추론 서버 E2E 스모크 테스트, Ubuntu CI 통과 | [§8](#8-검증과-성능-직접-실행-2026-11-26) |

[ ]는 95% 신뢰구간입니다. 모든 수치의 원본 파일과 문헌 출처는 [`docs/evidence-traceability.md`](docs/evidence-traceability.md)에서 확인할 수 있습니다.

### 주요 기능

| 기능 | 설명 |
|---|---|
| 모바일 VHI-30 문진 | 한 화면에 한 문항씩 표시하고 진행률을 보여 줍니다. 응답할 때마다 DB에 임시 저장되므로, 같은 ID로 다시 들어오면 이어서 작성할 수 있습니다 |
| 음성 파일 분석 | WAV·FLAC·OGG 파일을 업로드합니다. M4A·MP3는 브라우저에서 자동으로 WAV로 변환됩니다. 업로드 진행률이 표시되고, 3초 녹음은 약 1–1.4초 안에 분석됩니다(CPU) |
| 음향 지표 | F0 평균·SD·CV, 강도 CV, dBFS를 측정합니다. 지속 모음 과제에서는 Praat 기반 Jitter·Shimmer·HNR도 측정합니다 |
| 분포 밖 입력 경고 | 학습 데이터와 너무 다른 녹음이면 점수 해석을 막고 이유를 표시합니다 |
| 환자 기록 조회 | Subject ID별로 녹음 결과와 최신 문진 결과를 함께 볼 수 있습니다 |
| 추적 가능한 저장 | 저장된 모든 점수에 가중치 SHA-256이 기록되어 학습 실행까지 거슬러 올라갈 수 있습니다 |
| 보안 기본값 | DB에는 서버만 접근할 수 있고(클라이언트 전면 차단), 추론 서버는 토큰으로 인증합니다. 원본 음성은 저장하지 않습니다 |

### 평가 기준별 근거 위치

설계 교과목의 5개 평가 기준에 대응하는 근거를 한곳에 모았다. 각 링크는 수치·코드·테스트로 직접 확인할 수 있는 위치를 가리킨다.

| 평가 기준 (배점) | 확인할 수 있는 근거 | 위치 |
|---|---|---|
| **배경·필요성** (10) | ALS 진단 지연 11–11.5개월 등 정량 근거와 출처, 기존 연수 기능 평가·사전문진의 한계, 대상 집단과 용도 정의(PPV 계산) | [§1](#1-배경-및-필요성), [참고문헌](#참고문헌) |
| **기술 구체성·이해도** (20) | 시스템·데이터 흐름, 모델 사양(층·pooling·학습 설정), 학습–추론 전처리 일치, API 명세, 인증·OOD·음향 지표 구현, 구현 안전장치 12종 | [동작 원리](#어떻게-동작하나요), [§2](#2-시스템-구조), [§3](#3-배포-모델의-근거), [API](#api), [§11](#11-구현-세부) |
| **근거·논리성** (10) | 피험자 단위 지표와 cluster bootstrap CI, 같은 분할 9구성 × 3 seed 비교(Holm·Bonferroni 보정), 누수 방지 절차, 부정 결과·실패 실험 공개, 주장별 출처 추적표 | [§3.2](#32-성능-같은-분포-내부-시험), [§4](#4-모델-선택-근거-같은-분할에서의-비교-실험), [추적표](docs/evidence-traceability.md), [실험 목록](docs/experiment-inventory.md) |
| **차별성·기대효과·기여** (20) | 실제 시스템 4개와 3축 비교, 기대효과를 입증/추정/미검증으로 구분, 작업별 커밋 해시가 붙은 개인 기여 표 | [§5](#5-기존-사전문진음성-선별-시스템과의-비교), [§7](#7-기대효과), [§12](#12-개인-기여) |
| **산출물 정확도** (40) | 따라 하는 설치·실행 절차, 자동 테스트(Python 33·TS 24)·E2E 스모크·CI 통과, 배포 가중치 출처 11개 검사, 실제 화면, 문제 해결 표, 한계 명시 | [빠른 시작](#빠른-시작), [테스트와 재현](#테스트와-재현), [§8](#8-검증과-성능-직접-실행-2026-11-26), [§9](#9-기술적-한계와-남은-과제), [CI](https://github.com/KYU-SW/INSIGHT/actions/workflows/ci.yml) |

---

## 어떻게 동작하나요

```mermaid
flowchart LR
    P["환자 (스마트폰)"] -->|1. VHI-30 문진| Q["/questionnaire"]
    P -->|2. 녹음 파일 업로드| A["/analysis"]
    Q --> N["Next.js 서버<br/>점수 재계산 · 검증"]
    A --> N
    N -->|Bearer 토큰| F["FastAPI 추론 서버<br/>HuBERT → MLP<br/>OOD 검사 · 음향 지표"]
    F --> N
    N -->|서버 전용 자격 증명| D[("Firebase<br/>Realtime DB")]
    D --> R["/patients<br/>의료진 조회"]
```

1. **문진.** 환자가 가명 Subject ID(예: `SUBJ_001`)로 VHI-30 30문항에 0–4점으로 답합니다. 점수는 서버가 원본 응답으로 다시 계산합니다.
2. **음성 분석.** 같은 ID로 녹음 파일을 올리면 추론 서버가 결과를 돌려줍니다.
   - 처리 경로: 16 kHz 변환 → HuBERT 7번째 층 표현 → 시간축 max pooling → MLP. 이 경로로 **음성 이상 점수**(0–100)를 계산합니다.
   - 같은 녹음에서 **음향 지표**를 따로 측정합니다.
   - 녹음이 학습 분포 밖이면 **경고**를 함께 붙입니다.
3. **조회.** 의료진은 `/patients`에서 문진과 음성 결과를 나란히 봅니다. 두 값은 서로 다른 것을 측정하므로 **합산하지 않습니다**([§1.4](#14-문진과-음향-분석을-함께-쓰는-이유)).

---

## 빠른 시작

### 준비물

| 항목 | 버전 · 조건 | 비고 |
|---|---|---|
| Node.js | 22 이상 | CI와 같은 버전 |
| Python | 3.11 | 추론 서버. 다른 버전은 검증하지 않았습니다 |
| 디스크 | 여유 2 GB 이상 | HuBERT 체크포인트(약 1.2 GB) + 패키지 + 빌드 |
| 메모리 | 4 GB 이상 권장 | 추론 시 최대 약 3.1 GB RSS |
| GPU | 필요 없음 | CPU에서 3초 녹음 약 1초 |
| Firebase Realtime DB | 선택 | 없어도 분석은 됩니다. 저장·조회·문진 임시 저장에만 필요합니다 |

### 1. 저장소 받기와 의존성 설치

```sh
git clone https://github.com/KYU-SW/INSIGHT.git
cd INSIGHT

python3.11 -m venv .venv
.venv/bin/pip install -r requirements-inference.txt --extra-index-url https://download.pytorch.org/whl/cpu
npm install
```

### 2. 환경 변수 설정

```sh
cp .env.example .env.local
openssl rand -hex 32      # 출력값을 .env.local의 INSIGHT_BACKEND_TOKEN= 뒤에 붙여 넣는다
```

| 변수 | 필수 | 설명 |
|---|---|---|
| `INSIGHT_BACKEND_TOKEN` | **예** | Next.js 서버와 추론 서버가 공유하는 비밀값입니다. 비어 있으면 추론 서버는 모든 요청을 거부합니다. `NEXT_PUBLIC_`을 붙이지 않으므로 브라우저에 노출되지 않습니다 |
| `INFERENCE_API_URL` | 아니요 | 추론 서버 주소. 기본값 `http://127.0.0.1:8001` |
| `FIREBASE_DATABASE_URL` | DB 사용 시 | `https://<프로젝트>-default-rtdb.<지역>.firebasedatabase.app` |
| `FIREBASE_DATABASE_SECRET` | DB 사용 시 (택1) | Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 데이터베이스 비밀번호 |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | DB 사용 시 (택1) | 저장소 **밖**에 둔 서비스 계정 키 JSON의 절대 경로 |

> [!IMPORTANT]
> `.env.local`은 `.gitignore`에 포함되어 있습니다. 자격 증명을 커밋하지 마세요. DB를 쓴다면 [`firebase.database.rules.json`](firebase.database.rules.json)을 콘솔의 규칙에 적용해 클라이언트 접근을 막으세요([§10](#10-realtime-database와-보안)).

### 3. 실행 (터미널 2개)

```sh
# 터미널 1: 추론 서버 (127.0.0.1:8001). 첫 실행 때 HuBERT 체크포인트를 내려받습니다
HF_HOME=./hf-cache npm run backend

# 터미널 2: 웹 앱 (127.0.0.1:3000)
npm run dev
```

브라우저에서 <http://127.0.0.1:3000>을 엽니다. 운영 모드로 실행하려면 `npm run build && npm start`를 씁니다.

### 4. 동작 확인

1. **Voice Analysis** 탭에서 Subject ID에 `DEMO_001`을 입력합니다.
2. 파일로 [`examples/synthetic_vowel_a_unstable.wav`](examples/)를 선택하고 **Analyze recording**을 누릅니다.
3. 점수, OOD 경고, Jitter 2.21% / Shimmer 8.25% / HNR 9.7 dB가 나오면 정상입니다(위 스크린샷과 같은 화면).

명령줄에서 같은 결과를 확인하려면 `.venv/bin/python scripts/reproduce_inference.py`를 실행합니다(`PASS` 출력).

### 5. (선택) 휴대폰에서 접속하기

휴대폰 브라우저에서 PWA로 설치하거나 파일을 고르려면 HTTPS가 필요합니다.

```sh
npm run build && npm start
cloudflared tunnel --url http://127.0.0.1:3000   # 출력된 https://...trycloudflare.com 주소로 접속
```

> [!CAUTION]
> 터널 주소는 인터넷에 공개됩니다. 시험 데이터만 사용하고, 끝나면 터널을 종료하세요.

---

## 사용 방법

### 환자: VHI-30 문진 작성 (`/questionnaire`)

| 문항 화면 | 결과 화면 |
|---|---|
| <img src="docs/ui-verification/vhi-mobile-question.png" width="300" alt="VHI-30 문항 화면"> | <img src="docs/ui-verification/vhi-mobile-result.png" width="300" alt="VHI-30 결과 화면"> |

1. 실명이나 병원 등록번호 대신 **가명 Subject ID**를 입력하고 **문진 시작**을 누릅니다.
2. 문항마다 0(전혀 없음)부터 4(항상)까지 고릅니다. PC에서는 키보드 `0`–`4`로도 답할 수 있습니다.
3. 중간에 나가도 DB가 연동되어 있으면 응답이 자동 저장됩니다. 같은 ID로 다시 시작하면 이어서 작성하고, 처음부터 하려면 **처음부터 다시**를 누릅니다.
4. 제출하면 총점(0–120)과 기능·신체·정서 영역 점수가 나옵니다. **DB 업로드**를 누르면 최종 결과로 저장되고 임시 저장본은 삭제됩니다.

> [!NOTE]
> 문항은 PhenX 영문판(PX201301)을 개발용으로 번역한 것이며, 공식 K-VHI 검증본이 아닙니다. 한국어판 기준값이 없어 중증도 등급은 표시하지 않습니다.

### 환자 또는 의료진: 음성 분석 (`/analysis`)

1. **Subject ID**는 문진과 같은 ID를 씁니다. **Task**는 녹음한 과제를 고르고, **Recording Time**은 녹음한 시각을 입력합니다.
2. 녹음 파일을 선택하고 **Analyze recording**을 누릅니다.
3. 결과에서 **DB 업로드**를 누르면 저장됩니다. 상단의 **DB 연동**이 먼저 연결되어 있어야 합니다.

**지원 과제와 녹음 요령**

| 과제 코드 | 내용 | 녹음 요령 | Jitter·Shimmer·HNR |
|---|---|---|---|
| `vowel_a` `vowel_e` `vowel_i` `vowel_o` `vowel_u` | 지속 모음 /a/ /e/ /i/ /o/ /u/ | 편한 높이와 크기로 한 번에 길게(3초 이상) 발성 | 측정함 |
| `syllable_pa` `syllable_ta` `syllable_ka` | 교대운동(DDK) /pa/ /ta/ /ka/ 반복 | 같은 음절을 가능한 빠르고 규칙적으로 반복 | 측정하지 않음 (지속 발성에서만 정의됨) |

- **파일 형식:** WAV·FLAC·OGG는 그대로 올라가고, M4A·MP3·AAC는 브라우저에서 16 kHz WAV로 바뀝니다.
- **크기·길이 제한:** 파일 최대 25 MB, 녹음 최대 120초입니다.
- **녹음 환경:** 조용한 곳에서 입과 마이크 사이를 일정하게 유지하세요. 학습 데이터는 8 kHz 스마트폰 녹음이라, 고음질 녹음도 같은 대역으로 낮춰 분석합니다.

**결과 화면 읽는 법**

| 항목 | 의미 | 주의 |
|---|---|---|
| 음성이상점수 (0–100) | 모델이 추정한 ALS 음성 패턴의 정도 | 보정된 확률이 아닙니다. 검증된 기준점이 없어 상태는 "미분류"로 표시됩니다 |
| 학습 분포 밖 입력 경고 | 녹음 특징이 학습 데이터(SAND)와 너무 다름 | 이 경고가 뜨면 점수를 해석하지 않습니다 |
| Jitter · Shimmer · HNR | 성대 진동의 주기·진폭 불규칙성, 조화음 대 잡음비 | 기술 지표일 뿐이며 정상/비정상 기준이 아닙니다 |
| Recording Quality | 녹음 길이, dBFS, 클리핑 비율 | dBFS는 보정되지 않은 상대 음량입니다 |
| 모델 근거 | 내부 시험 성능과 실행 중인 가중치의 SHA-256 일치 여부 | 일치하지 않으면 경고가 표시됩니다 |

### 의료진: 기록 조회 (`/patients`, `/history`)

상단의 **DB 연동**을 누르고, **DB 불러오기**로 저장된 결과를 가져옵니다. 왼쪽에서 Subject ID를 고르면 그 사람의 녹음별 결과와 최신 VHI-30 결과가 함께 표시됩니다. `/history`에서도 같은 **DB 불러오기** 버튼으로 전체 분석 이력을 시간순으로 볼 수 있습니다. 학습 분포 밖으로 판정된 기록은 점수 옆에 `OOD`가 표시되고, DB에서 다시 불러와도 경고가 유지됩니다.

![Registry: DB에서 다시 불러온 기록의 상세 화면](docs/ui-verification/insight-registry-desktop.png)

---

## API

추론 서버(`src/backend/app.py`)는 분석용 `POST /analyze`와 상태 확인용 `GET /health`(인증 불필요, 모델을 로드하지 않음)를 제공합니다. 브라우저는 이 서버를 직접 호출하지 않으며, Next.js의 `/api/analyze`가 토큰을 붙여 대신 전달합니다.

```sh
curl -X POST http://127.0.0.1:8001/analyze \
  -H "Authorization: Bearer $INSIGHT_BACKEND_TOKEN" \
  -F "file=@examples/synthetic_vowel_a_steady.wav" \
  -F "user_id=SUBJ_001" \
  -F "task_code=vowel_a" \
  -F "recording_timestamp=2026-11-26T09:00:00+09:00"
```

| 필드 | 필수 | 형식 |
|---|---|---|
| `file` | 예 | WAV · FLAC · OGG, 25 MB 이하, 120초 이하 |
| `user_id` | 예 | 영문 대문자·숫자·`_`·`-` 1–80자 (소문자는 대문자로 바뀜) |
| `task_code` | 아니요 | 위 과제 코드 중 하나. 기본값 `vowel_a` |
| `recording_timestamp` | 아니요 | 시간대가 포함된 ISO 8601. 없으면 서버 시각 |

<details>
<summary><b>응답 예시</b> (위 명령을 실제로 실행한 결과)</summary>

```json
{
  "user_id": "SUBJ_001",
  "recording_timestamp": "2026-11-26T09:00:00+09:00",
  "analyzed_at": "2026-11-26T04:03:53.960925+00:00",
  "task": { "code": "vowel_a", "label": "Sustained /a/" },
  "model": {
    "name": "MLP_MAX_h07",
    "score": 0.9999819993972778,
    "display_score": 100.0,
    "status": null,
    "status_reason": "Input is outside the model's training feature distribution (OOD gate); the score is shown but is not interpretable for this recording",
    "ood": { "distance": 2.6282, "threshold": 1.7181, "in_distribution": false }
  },
  "phonation": { "stability": null, "pitch_stability": 7.1e-06, "intensity_stability": 0.0740 },
  "acoustic": {
    "jitter_percent": 0.0015, "shimmer_percent": 1.036, "hnr_db": 43.90, "voice_quality_reason": null,
    "mean_pitch_hz": 120.00, "pitch_sd_hz": 0.00085, "pitch_cv": 7.1e-06,
    "intensity_cv": 0.0740, "mean_intensity_dbfs": -12.57
  },
  "recording_quality": { "assessment": null, "duration_seconds": 3.0, "rms_dbfs": -12.57, "near_full_scale_percent": 0.0 }
}
```

`null`은 "측정하지 않음" 또는 "검증된 기준이 없음"을 뜻하며, 0으로 대체하지 않습니다. 소수점 자릿수는 읽기 쉽게 줄였습니다.

</details>

| 상태 코드 | 의미 |
|---|---|
| 200 | 분석 성공 |
| 401 | `Authorization` 헤더가 없거나 토큰이 틀림 |
| 413 | 파일이 25 MB를 넘음 |
| 415 | WAV·FLAC·OGG가 아님 |
| 422 | Subject ID·과제 코드·시각 형식 오류, 120초 초과, 너무 짧거나 손상된 녹음 |
| 503 | 서버에 토큰이 설정되지 않음, 또는 모델 로딩 실패 |

Next.js 서버의 다른 API(`/api/database/*`, `/api/model-card`)와 DB 레코드 구조는 [`docs/database-schema.md`](docs/database-schema.md)에 정리되어 있습니다.

---

## 프로젝트 구조

```text
INSIGHT/
├── src/
│   ├── app/                    # Next.js 페이지와 API 라우트
│   │   ├── questionnaire/      #   VHI-30 문진
│   │   ├── analysis/           #   음성 분석
│   │   ├── patients/ history/  #   의료진 조회
│   │   └── api/                #   analyze(추론 프록시) · database/* · model-card
│   ├── backend/                # Python 추론 서버 (FastAPI)
│   │   ├── app.py              #   /analyze, 토큰 인증, 입력 검증
│   │   ├── model.py            #   HuBERT 로딩, 전처리, 점수, OOD 검사
│   │   ├── acoustics.py        #   F0·강도·Jitter·Shimmer·HNR
│   │   └── interpretation.py   #   상태 분류 (검증된 기준이 없어 null)
│   ├── components/             # 화면 컴포넌트
│   ├── lib/                    # Firebase 접근, VHI 채점, 오디오 변환, Subject ID 규칙
│   └── data/                   # VHI-30 문항, 음성 과제 목록
├── head.pt · scaler.npz        # 배포 분류기 가중치와 표준화 통계
├── model_card.json             # 학습 실행·분할·성능·출처 검사 결과
├── ood_calibration.json        # OOD 임계값과 산출 근거
├── provenance/                 # 학습·비교 실험 원본 결과 사본 (Drive ID·SHA-256 포함)
├── scripts/                    # 모델 카드 생성·검증, OOD 보정, 재현, 서버 실행
├── experiments/                # 대역폭 가설(부정 결과), h7 다중 seed·OOD 재보정 스크립트
├── examples/                   # 합성 음성과 기대 출력
├── notebooks/                  # 배포 가중치를 만든 학습 노트북 (Colab)
├── tests/                      # TypeScript 테스트 · tests/python 백엔드 테스트
├── design/stitch-mockups/      # 초기 Google Stitch 화면 시안 (실행에 사용하지 않음)
└── docs/                       # DB 스키마, 근거 추적표, 실험 목록, 화면 검증 이미지 (archive/: 지난 계획 문서)
```

---

## 테스트와 재현

```sh
npm run lint && npm run typecheck && npm test            # 웹: 정적 검사 + TypeScript 테스트 24개
.venv/bin/python -m unittest discover -s tests/python -v  # 백엔드 테스트 33개
sh scripts/smoke_backend.sh                               # 추론 서버를 실제로 띄워 인증·분석·OOD 응답 확인 (E2E)
.venv/bin/python scripts/build_model_card.py --check      # 배포 가중치 ↔ 학습 실행 11개 검사
.venv/bin/python scripts/calibrate_ood.py --check         # OOD 임계값 재계산 일치 확인
.venv/bin/python scripts/reproduce_inference.py           # 합성 음성으로 추론 결과 재현
```

GitHub Actions([`ci.yml`](.github/workflows/ci.yml))가 push마다 Ubuntu에서 위 검사를 모두 실행합니다.

---

## 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| `npm run backend`가 "INSIGHT_BACKEND_TOKEN is empty"를 출력하고 종료 | `.env.local`에 토큰이 없음 | [2단계](#2-환경-변수-설정)대로 토큰을 넣습니다. 로컬 실험에서만 `INSIGHT_ALLOW_UNAUTHENTICATED=1 npm run backend`로 인증을 끌 수 있습니다 |
| 화면에 "Inference server rejected this app's credentials" (502) | 두 서버의 토큰이 다름 | `.env.local`을 고친 뒤 **두 서버를 모두 재시작**합니다 |
| 화면에 "Inference server is unavailable" (503) | 추론 서버가 꺼져 있거나 주소가 다름 | 터미널 1이 실행 중인지, `INFERENCE_API_URL`이 맞는지 확인합니다 |
| `uvicorn`으로 직접 띄웠더니 모든 요청이 503 | 토큰 환경 변수가 전달되지 않음 | `npm run backend`(`scripts/run_backend.sh`)로 실행합니다 |
| 첫 분석만 오래 걸림 (약 9초) | 모델을 메모리에 올리는 중 | 정상입니다. 이후 요청은 1–1.4초입니다. 첫 실행 때는 HuBERT 다운로드(약 1.2 GB) 시간이 더 듭니다 |
| 점수가 100 근처이고 "학습 분포 밖 입력" 경고 | 합성음·음악·잡음, 또는 학습 데이터와 조건이 매우 다른 녹음 | 의도된 동작입니다. 이 경우 점수를 해석하지 않습니다 ([FAQ](#자주-묻는-질문)) |
| Jitter·Shimmer·HNR이 비어 있음 | DDK 과제(/pa/ /ta/ /ka/)이거나 유성 구간이 0.5초 미만 | 지속 모음 과제로 3초 이상 녹음합니다. 결과에 이유가 함께 표시됩니다 |
| "이 오디오 형식을 읽을 수 없습니다" | 브라우저가 해당 코덱을 지원하지 않음 | WAV·FLAC·OGG로 변환해 올립니다 |
| "Firebase … 권한이 없습니다 (401/403)" | DB 자격 증명이 없거나 틀림 | `FIREBASE_DATABASE_SECRET` 또는 서비스 계정 경로를 확인합니다 |
| "FIREBASE_DATABASE_URL is not set" | DB 주소 미설정 | `.env.local`에 주소를 넣거나, DB 없이 분석만 사용합니다 |
| 휴대폰에서 파일 선택·설치가 안 됨 | HTTP 접속 | [5단계](#5-선택-휴대폰에서-접속하기)의 HTTPS 터널을 사용합니다 |

---

## 자주 묻는 질문

<details>
<summary><b>이 점수로 ALS를 진단할 수 있나요?</b></summary>

아니요. 내부 시험(이탈리아어 화자 41명)의 성능일 뿐이고 임상 검증을 하지 않았습니다. 일반 인구에 적용하면 ALS가 매우 드물어서 양성 판정의 대부분이 위양성이 됩니다(양성예측도 약 0.013%). 그래서 INSIGHT는 음성·연수 증상으로 내원한 환자 중 **신경과 의뢰 우선순위를 정하는 보조 용도**로 설계했습니다([§1.5](#15-insight가-다루는-문제와-위치)).

</details>

<details>
<summary><b>왜 제 녹음은 점수가 거의 100이고 경고가 뜨나요?</b></summary>

모델은 SAND 데이터(이탈리아어, 8 kHz 스마트폰 앱 녹음)로만 학습했습니다. 이와 크게 다른 입력이 들어오면 점수가 0이나 1 근처로 쏠리는 **포화** 현상이 있습니다. 대표적인 예는 합성음, 잡음, 다른 언어, 다른 녹음 장비입니다. 이런 입력을 걸러내려고 특징 공간 거리 기반 **OOD 검사**를 넣었고, 검사에 걸리면 점수를 해석하지 않도록 상태를 비워 둡니다. 임계값의 한계는 [§9](#9-기술적-한계와-남은-과제)에 적었습니다.

</details>

<details>
<summary><b>왜 HuBERT를 썼나요? 더 단순한 모델은 안 되나요?</b></summary>

구음장애 검출에서 HuBERT 표현이 eGeMAPS 같은 수기 음향 특징보다 정확하다는 보고가 있습니다[R13]. 자체 실험에서도 수기 특징 88개를 HuBERT에 더해 얻은 이득은 작았습니다. 반대로 attentive pooling, LoRA 미세조정처럼 더 복잡한 구성도 이득이 없었기 때문에, HuBERT 위에 가장 가벼운 MLP를 얹은 구조를 택했습니다([§4](#4-모델-선택-근거-같은-분할에서의-비교-실험)).

</details>

<details>
<summary><b>GPU가 필요한가요?</b></summary>

필요 없습니다. Intel CPU 노트북에서 3초 녹음 기준 약 1초가 걸립니다. 녹음이 길수록 시간이 빠르게 늘어나므로(60초 → 약 41초), 과제당 수 초 길이의 녹음을 권장합니다.

</details>

<details>
<summary><b>DB 없이도 쓸 수 있나요?</b></summary>

네. 분석과 문진은 DB 없이 동작하고, 결과는 현재 브라우저 세션에만 남습니다. 저장, 다른 기기에서 조회, 문진 이어쓰기를 하려면 Firebase 연동이 필요합니다.

</details>

<details>
<summary><b>원본 음성은 어디에 저장되나요?</b></summary>

저장되지 않습니다. 업로드된 파일은 추론 서버의 임시 파일로만 쓰이고 분석이 끝나면 바로 삭제됩니다. DB에는 점수, 음향 지표, 녹음 메타데이터만 저장됩니다.

</details>

---

# 연구·설계 문서

아래는 이 시스템을 왜 이렇게 설계했는지, 그 근거는 무엇인지, 무엇이 아직 검증되지 않았는지를 정리한 문서입니다.

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
  /api/model-card (가중치 SHA-256 대조)      → 특징 공간 OOD 거리 검사 (분포 밖이면 상태 해석 차단)
   │ 서버 전용 자격 증명 (.env.local)        + F0(YIN)·강도 CV·dBFS, 지속 모음은 Jitter·Shimmer·HNR(Praat) (모델과 독립)
   │ Next.js → FastAPI: Authorization: Bearer (서버 전용 토큰, 미설정 시 503)
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

### 4.1 Drive 전체 실험 조사 결과

연구 Drive의 ALS 실험 결과를 모두 조사해 [`docs/experiment-inventory.md`](docs/experiment-inventory.md)에 정리했다. 원본 지표 파일은 `provenance/` 아래에 SHA-256과 함께 복사되어 있다. 배포 판단에 영향을 주는 결과는 다음과 같다.

| 실험 | 분할 | 결과 | 의미 |
|---|---|---|---|
| 층 탐색 재실행 `20261005T080540` (특징 캐시 v2) | 9bb28df8, seed 42 | 검증으로 선택된 층이 **h4**(시험 녹음 ACC 78.35%). 같은 실행의 h7은 78.05% | 층 선택(h7)은 실행 간에 안정적이지 않다. h4와 h7의 차이는 작다 |
| HuBERT h4 + eGeMAPS 결합 (5 seed) | 9bb28df8 | 기준 피험자 AUC 0.890 ± 0.003, Early3 결합 0.901 ± 0.004 | 수기 특징을 결합한 이득은 작다 (§4 EXP03과 일치) |
| 수기 특징 65개 + ElasticNet (`ML_EXPERIMENT_01/02`) | **SAND 공식 분할** | 검증 AUROC 0.838 [0.707–0.939] | 독립 기준 모델. 다만 공식 검증 53명 중 35명이 배포 모델의 학습 집합에 있어 **직접 비교할 수 없다** |
| frozen WavLM + ElasticNet | SAND 공식 분할 | 검증 AUROC 0.832, 수기 특징 대비 ΔAUROC −0.009 [−0.161, 0.134] | 인코더를 바꿔도 차이가 없다 |
| Data2Vec 미세조정 | 별도 VOC-ALS 분할 | AUROC 0.589, 특이도 0 (전원을 ALS로 예측) | 실패한 실험이며 배포 판단에 사용하지 않았다 |
| eGeMAPS 88개 군 비교 | 분할 없음 | FDR 유의 특징 27/88, 최대 단일 특징 AUC 0.72 (F0 범위) | 음향 차이는 존재하지만 단일 특징으로는 분리력이 낮다 |

**결론.** 배포 구성(h7 + max + MLP)의 다중 seed 결과는 없다. 다중 seed 결과는 모두 h4 구성이다. 따라서 §3.2의 신뢰구간은 피험자 재표본 불확실성만 반영하며, 학습 seed 변동은 반영하지 않는다. 같은 9bb28df8 분할에서 학습한 수기 특징 단독 모델도 없다.

### 4.2 설계 결정의 실험 근거

모델과 프로토콜의 주요 설계 결정은 아래 분석에 근거한다. 원본 결과 파일은 `provenance/`에 있다.

**(1) 사전학습 음성 표현(HuBERT)을 택한 근거.** 구음장애 검출에서 HuBERT 특징이 eGeMAPS 등 수기 특징 기준보다 검출 정확도가 1.33–2.86%p 높았다는 선행 보고가 있다[R13]. 자체 실험에서도 수기 특징 88개를 모두 결합한 구성의 이득은 피험자 AUC +0.010(0.890 → 0.900)에 그쳤다(`HUBERT_EGEMAPS_FUSION_*`). HuBERT 표현이 수기 특징 정보의 대부분을 이미 담고 있다고 해석한다.

**(2) 가설 기반 음향 특징 선정.** eGeMAPS 88개 특징을 ALS 165명과 HC 106명 사이에서 비교했다(Cliff's delta, FDR 보정, 성별·연령 공변량 보정). 그 결과 27개가 유의했다(보정 후 32개). 효과가 가장 큰 특징은 F0 범위(F0semitone_pctlrange0-2, delta +0.45, AUC 0.72)였다. 이는 F0 변동성이 ALS 식별에 유용하다는 보고[R14]와 일치한다. 이 분석에서 주파수(F0 범위)·스펙트럼(F3 상대에너지)·시간(loudnessPeaksPerSec) 묶음의 특징 3개를 골라 HuBERT와 결합했다.

| 비교 (5 seed) | ΔAUC (녹음) | AUC 개선 seed |
|---|---|---|
| 특징 3개 추가 (pooling 후, Late3 − Baseline) | +0.004 ± 0.006 | 4/5 |
| 특징 3개 추가 (pooling 전, Early3 − EarlyHuBERTonly) | +0.005 ± 0.004 | 4/5 |
| 결합 위치: pooling 전 vs 후 (Early3 − Late3) | **+0.022 ± 0.008** | **5/5** |
| 88개 → 3개 축소 (Late3 − Concat) | −0.010 ± 0.007 | 0/5 |

특징을 추가해 얻는 이득은 작았다. 결합 위치(시간 집계 전)의 효과는 5개 seed 모두에서 일관되었다. 이 결과는 프레임 단위 시간 정보가 global pooling에서 일부 손실된다는 가설과 부합한다. 다만 Early3는 파라미터 수가 2.3배이므로, 구조 차이를 분리한 검증은 아직 하지 않았다.

**(3) 음성 과제 구성의 근거.** 과제별로 유의한 eGeMAPS 특징 수는 /ka/ 반복 34개, /e/ 29개, /a/ 28개, /i/ 24개, /ta/ 19개, /o/ 18개, /pa/ 18개, /u/ 14개였다. 지속 모음만으로는 정보가 부족하며, 그래서 연구개 조음(/ka/)을 포함한 DDK 과제를 프로토콜에 넣었다. /ka/가 가장 많은 것은 연수 침범에 따른 혀 운동 저하로 설명될 수 있으나, 이는 해석이며 검증하지 않았다.

**(4) 구음장애 없는 ALS(초기 단계) 별도 평가.** 배포 모델의 Class 4 검출(§3.2) 외에, 수기 특징 모델로도 Class 4와 HC만 따로 비교했다. 공식 검증 분할에서 ElasticNet은 AUROC 0.827(n = 35, 민감도 85.7%, 특이도 66.7%), frozen WavLM은 0.765였다(`ML_EXPERIMENT_02/03_class4_vs_class5.csv`, `ML_EXPERIMENT_T1_*/07_class4_vs_class5.csv`). 구음장애가 평정되지 않은 단계에서도 음향 신호가 존재한다는 관찰이 두 모델 계열에서 반복된다. 단, 이 결과는 공식 분할에서 얻은 값이므로 §3.2와 직접 비교하지 않는다.

**(5) 누수 방지 절차.**
- 피험자 단위로 분할하고, 분할 간 중복을 검사했다.
- scaler는 train 분할에만 적합시켰다.
- 증강은 train 분할에만 적용했다.
- HPO·early stopping·임계값 선택은 validation 분할에서만 했다.
- test는 설정을 고정한 뒤 1회만 평가했다.
- HPO seed와 평가 seed를 분리했다.

결과는 Bonferroni(×7) 보정 CI를 사전 판정 기준으로 해석했다(`research_report.md`).

**(6) 비용–성능 측정.** 비교 실험에서는 성능과 함께 학습 비용도 기록했다(`computational_cost.csv`).

| 구성 | 학습 파라미터 | 최대 GPU 메모리 | 추론 |
|---|---|---|---|
| 배포 구조(BASE) | 13.1만 | 596 MB | 0.03 ms/녹음 |
| LoRA 미세조정(EXP07) | 26.2만 (전체 6,377만) | 1,659 MB | 43.7 ms/녹음 |

LoRA는 AUROC가 0.84로 더 낮았다. 따라서 가장 단순한 구조가 비용과 성능 모두에서 우위였다.

**실험 규모.**

| 실험 | 학습 횟수 |
|---|---|
| 층 탐색 (2회 실행) | 300회 |
| HuBERT + eGeMAPS 결합 | 60회 (5 seed) |
| 비교 실험 | 최종 27회 (3 seed) + HPO 88 trial |
| 수기 특징·WavLM 기준 모델 | 공식 분할, 반복 교차검증 |

실패한 실험(Data2Vec, 특이도 0)과 부정 결과(대역폭 가설 기각, §8)도 함께 기록했다.

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

## 6. 화면 구성

설치와 실행 방법은 [빠른 시작](#빠른-시작), 화면별 사용법은 [사용 방법](#사용-방법)에 있다.

| 경로 | 내용 |
|---|---|
| `/questionnaire` | VHI-30 문진. 모바일에서 한 화면에 한 문항, 진행률, 이전/다음, 미응답 안내. DB 연동 시 응답마다 임시 저장, 같은 ID로 재시작하면 이어서 작성 |
| `/analysis` (`/`) | Subject ID·과제·녹음 시각 입력 후 **기존 오디오 파일 업로드**(앱 내 녹음 없음) |
| `/patients` | Subject ID별 녹음 결과와 최신 VHI-30 결과. DB 불러오기 |
| `/history` | 전체 분석 이력 |

---

## 7. 기대효과

| 구분 | 내용 | 근거 · 가정 |
|---|---|---|
| **실험으로 입증** | 내부 시험 41명에서 피험자 단위 AUROC 0.898 [0.783–0.980], 민감도 92.0%, 특이도 75.0% | §3.2, 같은 SAND 분포 |
| | 구음장애가 평정되지 않은 ALS(Class 4) 10명 중 8명 검출 | §3.2, n = 10 |
| | 더 복잡한 8개 대안 대비 성능 저하 없이 추론 비용이 가장 낮은 구조 선택 (h4 기준 모델의 seed 간 AUROC SD 0.003; 배포 h7 구성의 seed 변동은 미측정) | §4, §4.1 |
| | 3초 녹음 기준 서버 응답 1.0–1.4 s(CPU), 문진·음성 결과의 DB 저장·재조회 E2E 통과 | §8 |
| **근거 기반 추정** | 사전확률 5–20%의 증상 내원 집단에서 PPV 16–48% — 일반 인구(0.013%)가 아닌 의뢰 집단에서만 유용 | §1.5 계산; 시험 성능이 외부 집단에 그대로 적용된다는 가정 |
| | 음성 변화가 있는 환자를 진료 전에 표시해 신경과 의뢰를 앞당길 수 있음 | 진단 지연 중앙값 11–11.5개월 [R1, R3], 말 증상과 빠른 진단의 연관 [R1]; 지연 단축 폭은 추정하지 않음 |
| **미검증** | 실제 진단 지연 단축, 의료진 업무 시간 절감, 문진 작성 시간, 스마트폰 고음질 녹음·한국어 화자에서의 성능 | 측정 자료 없음 |

---

## 8. 검증과 성능 (직접 실행, 2026-11-26)

환경: Intel Core i5-8279U 2.4 GHz, 16 GB, macOS, CPU 추론, Python 3.11.15, torch 2.2.2.

| 항목 | 결과 |
|---|---|
| `npm run lint` / `typecheck` / `npm test` | 통과, TypeScript 테스트 **24/24** (추론 API 경로의 토큰 전달·인증 오류 은닉, DB 업로드 실패 시 되돌리기, OOD 판정의 DB 저장·복원 포함) |
| Python 백엔드 테스트 (`python -m unittest discover -s tests/python`) | **33/33** (8 kHz 경로 동일성, 대역 제한, F0·dBFS, Jitter·Shimmer·HNR 합성 신호 검증, API 인증, `/health`, OOD 게이트, API 계약) |
| 추론 서버 E2E (`scripts/smoke_backend.sh`) | uvicorn을 실제로 띄워 `/health` → 토큰 없음·틀린 토큰 401 → 올바른 토큰 200(점수·Jitter·OOD 일관성) 확인. CI에서도 매 push 실행 |
| Jitter·Shimmer·HNR 정확도 (합성 150 Hz 모음) | 주기 변동 SD 2% 주입 → jitter 2.05–2.21% (해석적 기대값 2.26%). SNR 40/30/20/10 dB → HNR 40.1/30.1/20.1/10.3 dB |
| OOD 게이트 (`scripts/calibrate_ood.py --check`) | SAND 시험 특징 4개의 거리 0.87–1.15, 임계값 1.718. 합성 비음성 입력 9개(무음·잡음·순음·음악·합성 모음)는 1.74–3.00으로 모두 차단 |
| 가중치 증명 (`scripts/build_model_card.py --check`) | 11개 검사 통과 |
| 합성 음성 재현 (`scripts/reproduce_inference.py`) | PASS |
| `npm run build` | 성공, 24.9 s |
| CI (GitHub Actions `ci.yml`) | `web`: lint·typecheck·test·build / `model`: Python 테스트·가중치 증명·OOD 보정 검사·합성 음성 재현·추론 서버 E2E 스모크. **Ubuntu(GitHub Actions)에서 두 job 모두 통과** ([run 45784459989](https://github.com/KYU-SW/INSIGHT/actions/runs/45784459989), 커밋 `e199c19`). 이전에는 가중치 증명 검사가 러너 CPU에 따라 간헐적으로 실패했다. float32 1 ULP 차이가 카드 텍스트에 들어갔기 때문이며, `e199c19`에서 수정했다 |
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
| 분포 밖 입력 | **부분 해결.** 특징 공간 OOD 게이트를 구현했다: 표준화 특징의 RMS 거리를 쓰고, 분포 밖이면 상태 해석을 차단하고 사유를 표시한다. 합성 비음성 입력 9개는 모두 차단했다. OOD 판정은 DB에 함께 저장되어, 다시 불러온 기록에도 경고가 유지된다 | 임계값은 시험 특징 4개로만 정했다(최댓값 × 1.5, 시험 분할 사용). 실제 비SAND 음성(다른 언어·마이크)에서 분리되는지와 SAND 음성의 오거부율은 측정하지 않았다. 음악 입력은 임계값을 1%만 넘어 여유가 작다. 검증 분할 기반 재보정은 [`experiments/h7_multiseed/`](experiments/h7_multiseed/) 스크립트가 함께 산출한다(Colab 실행 필요). 점수 포화 자체(OOD 입력 0.9996 이상)는 모델 특성으로 남아 있다 |
| Jitter·Shimmer·HNR | **해결.** Praat(parselmouth 0.4.7) local jitter·shimmer, cc HNR을 지속 모음 과제에서만 산출한다. /pa/ /ta/ /ka/ 과제와 0.5 s 미만 유성 구간에서는 사유와 함께 `null`을 반환한다 | 8 kHz 녹음은 대역 상한이 4 kHz라 HNR을 광대역 규준치와 직접 비교할 수 없다. 임상 기준값은 적용하지 않았다(기술 지표로만 표시) |
| 외부 기준 모델 | 부분 — 수기 특징 + ElasticNet 기준 모델이 있으나 SAND 공식 분할 결과라 배포 모델과 직접 비교할 수 없다(§4.1) | 9bb28df8 분할에서 수기 특징 단독 모델을 학습해야 한다. Drive의 `EGEMAPS_V02_CACHE`로 가능하며 원본 음성은 필요 없다 |
| 배포 구성의 seed 변동 | 미해결 — h7 구성은 seed 42 단일 학습뿐이며, 같은 설계를 재실행했을 때 선택된 층이 h4로 바뀌었다(§4.1) | 재현 스크립트 [`experiments/h7_multiseed/run_h7_multiseed.py`](experiments/h7_multiseed/run_h7_multiseed.py)를 준비했다. 배포 레시피 그대로 seed 42–46을 학습하고, 피험자 bootstrap CI와 **검증 분할 기반 OOD 임계값**(99 백분위, 학습·시험 오거부율)을 함께 산출한다. Drive 특징 캐시가 녹음당 파일 2,164개로 나뉘어 있어 Colab에서 실행해야 한다. 캐시의 h07 max 특징은 provenance 시험 특징과 일치함을 확인했다(최대 차이 7.3×10⁻⁵, 특징 크기 약 80). 저장된 배포 확률도 재현된다 |
| 검정력 | 시험 41명(HC 16) | 외부 코호트·더 많은 대조군 필요; 교차검증은 미수행 |
| 언어·녹음 조건 | 이탈리아어, 8 kHz 스마트폰 앱 | 한국어 화자·고음질 녹음 검증 필요 |
| 점수 해석 | 상태 미분류, 보정 없음 | 의뢰 집단에서 운영 기준점·보정 검증 필요 |
| EMR 연동 | 자체 DB만 | FHIR 변환·병원 연동 미구현 |
| API 인증 | **부분 해결.** 추론 서버(FastAPI)는 Bearer 토큰 미들웨어로 보호한다. 토큰 비교는 상수 시간이고, 본문을 읽기 전에 거부하며, 토큰이 없으면 fail-closed로 동작한다 | Next.js API의 사용자(의료진·환자) 로그인은 아직 없다. 인증 체계 선택은 아키텍처 결정이 필요하다. 요청 빈도 제한도 없다 |
| DB 자격 증명 | 레거시 Database Secret 사용(서비스 계정도 지원) | 운영 전 서비스 계정으로 전환 권장 |
| LICENSE | **해결.** MIT 라이선스([`LICENSE`](LICENSE)) | 코드에만 적용된다. HuBERT 가중치와 SAND 데이터는 각자의 라이선스를 따른다 |

---

## 10. Realtime Database와 보안

- 구조와 필드: [`docs/database-schema.md`](docs/database-schema.md). 규칙 [`firebase.database.rules.json`](firebase.database.rules.json)은 모든 클라이언트 읽기·쓰기를 거부한다(비인증 요청 401 확인).
- Next.js 서버만 `.env.local`의 자격 증명(`FIREBASE_DATABASE_SECRET` 또는 `FIREBASE_SERVICE_ACCOUNT_PATH`)으로 접근한다. 자격 증명이 없으면 공개 접근으로 대체하지 않고 거부한다.
- 관리자 자격 증명은 규칙의 `.validate`를 우회하므로 필드 검증은 서버 코드가 담당한다. 필수 음향 값이 없으면 업로드를 막고 값을 만들어 넣지 않는다. 원본 음성은 저장하지 않는다.
- **실제 환자 데이터에는 사용하지 않는다.**

## 11. 구현 세부

`head.pt`가 분류기 구조의 기준이다. 고정 체크포인트의 legacy positional convolution 텐서는 로드 전에 현재 Transformers 키로 매핑해 학습된 값을 유지한다. 검증된 임상 기준값이 없어 `src/backend/interpretation.py`의 상태는 `null`(미분류)이다. VHI-30 문항은 PhenX 영문판(PX201301) 기반 **개발용 한국어 번역**이며 공식 K-VHI 검증본이 아니다. 원문 번호와 F/P/E 영역을 유지하고, 한국어판 기준값이 없어 총점과 영역별 점수만 표시한다.

**구현 안전장치.** 각 항목은 해당 코드와 자동 테스트로 확인할 수 있다.

| 영역 | 장치 | 위치 · 테스트 |
|---|---|---|
| 모델 로딩 무결성 | HuBERT를 커밋 해시(`ece5fabb`)로 고정해 내려받는다. `torch.load(weights_only=True)`로 pickle 코드 실행을 차단한다. head 층 키·HuBERT 누락/초과 키·scaler 차원이 하나라도 다르면 기동을 거부한다. 가중치를 학습 당시 값 그대로 쓰도록 legacy weight-norm 텐서를 매핑한다 | `src/backend/model.py` |
| 학습–추론 일치 | 8 kHz 입력은 학습 경로와 비트 단위로 같다. 고음질 입력은 학습 대역으로 제한한다 | `tests/python/test_backend.py` |
| 입력 제한 | 확장자 화이트리스트(WAV·FLAC·OGG), 25 MB·120 s 상한, 너무 짧은 녹음 거부. 인증은 본문을 읽기 전에 거부한다 | `src/backend/app.py`, `test_api_auth.py` |
| 브라우저 변환 | M4A·MP3 등은 브라우저 코덱으로 디코딩해 16 kHz mono PCM16 WAV로 바꾼다. 서버에는 원본 형식이 전달되지 않는다 | `src/lib/audio-convert.ts` |
| 쓰기 원자성 | 분석 결과는 4개 레코드로 나누어 저장한다. 중간에 실패하면 이미 쓴 레코드를 역순으로 삭제해 부분 기록을 남기지 않는다. 정리에도 실패하면 관리자 확인을 요구한다 | `src/lib/firebase-database.ts` · "a failed upload deletes the records already written…" |
| 임시 저장 순서 보장 | 문진 임시 저장 요청을 직렬 큐로 처리해 오래된 응답이 새 응답을 덮어쓰지 않는다. 최종 업로드는 대기 중인 임시 저장이 끝난 뒤 실행한다 | `vhi-questionnaire.tsx` |
| 서버 측 검증 | VHI 점수는 클라이언트 값을 무시하고 서버에서 다시 계산한다. 임시 저장 응답은 0–4 정수만 받는다. DB에서 읽은 레코드가 형식에 맞지 않으면 부분 점수를 만들지 않고 건너뛴다 | `database.test.ts`, `vhi.test.ts` |
| 측정하지 않은 값 | 없는 음향 값은 0으로 채우지 않고 `null`로 둔다. 검증된 기준값이 없는 상태 등급과 VHI 중증도는 표시하지 않는다 | `database.test.ts` "without inventing unavailable acoustic values" |
| ID 규칙 단일화 | Subject ID 정규식을 프론트엔드·DB·추론 서버가 같은 규칙으로 쓴다. 대문자로 정규화하고 실명 대신 가명을 쓰도록 안내한다 | `src/lib/subject-id.ts`, `subject-id.test.ts`, Python API 계약 테스트 |
| 추적성 | 저장된 모든 점수에 head·scaler·모델 카드의 SHA-256과 파이프라인 버전을 기록한다. 실행 중인 가중치가 모델 카드와 다르면 화면에 경고한다 | `model-card.test.ts` |
| 접근성 | 본문 바로가기 링크, `aria-current` 내비게이션, 문진 진행률 `progressbar`, 임시 저장 상태 `aria-live`, 라디오 `fieldset`/`legend`, 키보드 0–4 응답 단축키, 모바일 전용 하단 내비게이션 | `app-shell.tsx`, `vhi-questionnaire.tsx` |
| 오류 처리 | 업로드 진행률을 표시하고(XMLHttpRequest), 네트워크 오류·시간 초과·서버 오류를 구분해 한국어로 안내한다. 추론 서버의 인증 오류는 브라우저에 노출하지 않는다 | `analysisService.ts`, `analyze-route.test.ts` |

---

## 12. 개인 기여

저장소 작성자가 문제를 정의하고, 실험과 시스템을 설계·주도·검증했다. 아래는 저장소와 연구 기록으로 확인할 수 있는 범위다.

| 영역 | 기여 내용 | 확인 근거 |
|---|---|---|
| 문제 정의·기획 | ALS 진단 지연과 연수 증상의 조기 포착을 진료 전 음성 선별 문제로 정의, 선별 보조로 범위 설정 | §1, 초기 커밋 `ce9d62b` |
| 연구 방법론·실험 설계 | 피험자 단위 층화 분할, 검증 기반 층·하이퍼파라미터 선택, 시험 1회 평가, HPO seed와 평가 seed 분리, paired bootstrap·Holm 보정 비교 | `provenance/*/run_config.json`, `ALS_HC_7EXP_HPO_Research_Pipeline.ipynb`(Drive, 저장소 미포함), [`notebooks/HuBERT_Frozen_CNN_Pooling_Reproduction.ipynb`](notebooks/HuBERT_Frozen_CNN_Pooling_Reproduction.ipynb) |
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
| Jitter·Shimmer·HNR(Praat), 추론 서버 Bearer 인증, 특징 공간 OOD 게이트, 테스트 29+21개(당시) | [`8aec6e4`](https://github.com/KYU-SW/INSIGHT/commit/8aec6e4) |
| Drive 전체 실험 조사(층 재실행, eGeMAPS 결합 5 seed, 수기 특징·WavLM 기준 모델, 실패 실험)와 근거 사본 | [`afed8da`](https://github.com/KYU-SW/INSIGHT/commit/afed8da) |
| DB 업로드 실패 시 되돌리기 테스트, 구현 안전장치 문서화 | [`fca5b57`](https://github.com/KYU-SW/INSIGHT/commit/fca5b57) |
| OOD 판정의 DB 저장·복원, `/health`, CI 추론 서버 E2E, Registry·History 화면 결함 수정 | [`ff9219b`](https://github.com/KYU-SW/INSIGHT/commit/ff9219b) |
| 저장소 정리(시안·노트북 위치), 문서–코드 일치화 | [`366cc76`](https://github.com/KYU-SW/INSIGHT/commit/366cc76) |
| 평가 기준별 근거 위치표, h7 다중 seed·검증 분할 OOD 보정 스크립트 | [`4a9b85e`](https://github.com/KYU-SW/INSIGHT/commit/4a9b85e) |

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
- [R13] Javanmardi F, Kadiri SR, Alku P. Pre-trained models for detection and severity level classification of dysarthria from speech. *Speech Commun*. 2024;158:103047. doi:10.1016/j.specom.2024.103047
- [R14] Dubbioso R, Spisto M, Verde L, et al. Voice signals database of ALS patients with different dysarthria severity and healthy controls. *Sci Data*. 2024;11:800. doi:10.1038/s41597-024-03597-2
- [S1] Epic MyChart Help · [S2] Phreesia Platform · [S3] Phreesia Intake Forms · [S4] CHAI Registry: Canary Speech · [S5] App Store: Speech Vitals — URL은 추적표 참조

---

## 라이선스

코드는 [MIT 라이선스](LICENSE)를 따릅니다. HuBERT 체크포인트(`facebook/hubert-large-ls960-ft`)와 SAND 데이터셋은 각각의 라이선스와 이용 조건을 따르며, 이 저장소에는 SAND 원본 음성이 포함되어 있지 않습니다.
