# 근거 추적표와 참고문헌

README의 주요 주장을 원 근거와 연결한다. 문헌은 PubMed 초록(E-utilities `efetch`) 또는 공식 페이지 원문으로 확인했다(확인일 2026-11-26). 실험 수치는 `provenance/` 폴더의 원본 파일 사본에서 재계산된다.

## 1. 주장 → 근거

| # | README 주장 | 근거 | 확인 방법 |
|---|---|---|---|
| C1 | ALS 증상 발현부터 확진까지 중앙값 11.5개월, 환자의 52%가 다른 진단을 먼저 받고 평균 3명의 의사를 거친다 | [R1] Paganoni 2014 | PubMed 초록 |
| C2 | 21개 연구 종합 시 진단까지 통상 10–16개월 | [R2] Richards 2020 | PubMed 초록 |
| C3 | 4개국 1,405명에서 진단 지연 중앙값 11개월, 특이적 바이오마커가 필요 | [R3] Falcão de Campos 2023 | PubMed 초록 |
| C4 | 진단 지연은 희귀성과 이질적 증상으로 인한 1차 진료의 인지 부족에서 비롯되며, 상용 바이오마커가 없어 선별·분류(triage) 도구가 필요 | [R4] Gwathmey 2023 | PubMed 초록 |
| C5 | 발병 초기 '어눌한 말(slurred speech)'은 더 짧은 진단 소요시간의 독립 예측인자(p = 0.02) | [R1] Paganoni 2014 | PubMed 초록 |
| C6 | 한국 ALS 연간 발생률 10만 명당 1.20명, 유병률 3.43명(2015), 진단 시 평균 61.4세, 평균 생존 50.0개월 | [R5] Jun 2019 | PubMed 초록 |
| C7 | 연수(bulbar) 기능 저하는 ALS의 특징적 소견으로 생존·삶의 질에 영향을 주며, 기존 평가 도구들은 상당한 한계가 있다 | [R6] Yunusova 2019 | PubMed 초록 |
| C8 | 음성 저하는 연수 침범의 가장 이른 증상 중 하나 | [R7] Tena 2021 | PubMed 초록 |
| C9 | 기존 연수 기능 평가 도구는 초기 변화에 민감하지 않으며, 원격 수집 음성의 자동 분석으로 초기 변화를 검출할 수 있다(65명, 3–9개월) | [R8] Stegmann 2020 | PubMed 초록 |
| C10 | ALSFRS-R은 주관적 평정 기반으로 미세 변화를 놓칠 수 있고, 일부 음성 지표는 ALSFRS-R 발화 점수가 변하지 않아도 연수 기능 저하를 추적한다(278명) | [R9] Neumann 2024 | PubMed 초록 |
| C11 | 국내 성인 음성장애 유병률 8.12% | [R10] Kim 2016 | PubMed 초록 |
| C12 | SAND Class 4 = "ALS with no dysarthria", Class 5 = 건강군; 8 kHz·16 bit, 스마트폰 앱(Vox4Health) 녹음, 이탈리아어 화자 339명 | [R11] SAND 공식 페이지 | 공식 웹페이지 원문 |
| C13 | VHI-30 문항·영역·점수 체계 | [R12] Jacobson 1997, PhenX PX201301 | 기존 `src/data/vhi.ts` 대조 |
| C14 | HuBERT 특징이 수기 특징 기준보다 구음장애 검출 정확도 +1.33–2.86%p | [R13] Javanmardi 2024 | Crossref 서지 확인, 비교 실험 보고서(`research_report.md`)의 초록 인용 |
| C15 | F0 변동성이 ALS 식별에 유용 | [R14] Dubbioso 2024 | Crossref 서지 확인, 비교 실험 보고서의 초록 인용 |
| E7 | eGeMAPS 군 비교 27/88 유의, 과제별 유의 특징 수, 특징 3개 결합 효과 | `provenance/EGEMAPS_GROUP_ANALYSIS_*/summary.md`, `provenance/HUBERT_EGEMAPS_FUSION_20261112T011348_511305Z/selected3_pairwise.csv` | 원본 표 (Drive 사본) |
| E8 | Class 4 vs HC 별도 평가, 비용 측정 | `provenance/ML_EXPERIMENT_02/03_class4_vs_class5.csv`, `provenance/run_20261114T140021_240247Z_LOW_COST/computational_cost.csv` | 원본 표 (Drive 사본) |
| E1 | 배포 가중치 = 학습 실행 `20261005T055211_070474Z`의 산출물 (11개 검사) | `provenance/run_20261005T055211_070474Z/`, `scripts/build_model_card.py` | 오프라인 재계산 |
| E2 | 배포 모델 시험 피험자 단위 AUROC 0.898 [0.783–0.980], 민감도 92.0%, 특이도 75.0% | `model_card.json` `test_uncertainty` | 피험자 cluster bootstrap 10,000회 |
| E3 | 구음장애 없는 ALS(SAND Class 4) 10명 중 8명 검출 | `model_card.json` `subject_sensitivity_by_sand_class`, `provenance/run_20261114T140021_240247Z_LOW_COST/subject_severity.csv` | 피험자별 확률 평균 ≥ 0.5 |
| E4 | 같은 분할에서 9개 구성 × 3 seed 비교, 기준 모델 대비 유의한 개선 없음 | `provenance/run_20261114T140021_240247Z_LOW_COST/*.csv` | 원본 표 (Drive 사본, SHA-256 기록) |
| E5 | 두 실행의 피험자 분할이 동일 | `model_card.json` 검사 7 | 피험자→분할 매핑 비교 |
| E6 | E2E 추론 1.0–1.4 s(3 s 녹음, CPU) | README §8 측정 | 로컬 실행 측정 |
| E9 | Jitter·Shimmer·HNR은 Praat(parselmouth 0.4.7)로 지속 모음 과제에서만 산출하고, 그 외에는 사유와 함께 `null`. 합성 150 Hz 모음에서 jitter 2.05–2.21%(기대값 2.26%), HNR은 주입 SNR과 ±0.3 dB 이내 | `src/backend/acoustics.py`, `tests/python/test_backend.py`, README §8, [R15] | 단위 테스트는 주입 jitter 회복·HNR 단조 감소를 검사, 수치는 README §8 로컬 측정 |
| E10 | 특징 공간 OOD 게이트: 임계값 1.718, 합성 비음성 입력 9개 모두 차단. 임계값은 SAND 시험 특징 4개로만 정함(한계) | `ood_calibration.json`, `scripts/calibrate_ood.py`, `src/backend/model.py` | `python scripts/calibrate_ood.py --check` |
| E11 | 추론 서버는 `GET /health`를 제외한 모든 요청에 Bearer 토큰을 요구하고, 토큰 미설정 시 503(fail-closed) | `src/backend/app.py`, `tests/python/test_api_auth.py`, `tests/analyze-route.test.ts` | 단위 테스트 |
| E12 | CI(GitHub Actions, Ubuntu)에서 web·model job 통과 | `.github/workflows/ci.yml`, README §8 | Actions 실행 기록 |
| S1 | Epic MyChart: eCheck-In으로 진료 전 문진 응답, MyChart 정보는 의료기록에서 직접 표시 | [S1] mychart.org/help | 공식 페이지 원문 |
| S2 | Phreesia: 진료 전 등록·선별검사, PRO 자동 채점, HL7·FHIR·CCD 양방향 EHR 연동, 결과를 EHR로 전송 | [S2] phreesia.com/platform, [S3] /electronic-intake-forms | 공식 페이지 원문 |
| S3 | Canary Speech: 40초 이상 음성을 AI로 분석하는 인지건강 음성 바이오마커, 호환 EHR로 Epic·Oracle Health·Meditech 표기 | [S4] CHAI Registry | 등록 페이지 원문 |
| S4 | Aural Analytics Speech Vitals: 임상연구용 음성 수집·분석 앱(참여자 전용), ALS 연구에 사용 | [S5] App Store, [R8] | 공식 페이지 원문 |

## 2. 참고문헌

| ID | 문헌 | DOI / URL | 이 프로젝트에서 사용한 내용 |
|---|---|---|---|
| R1 | Paganoni S, Macklin EA, Lee A, et al. Diagnostic timelines and delays in diagnosing amyotrophic lateral sclerosis (ALS). *Amyotroph Lateral Scler Frontotemporal Degener*. 2014;15(5-6):453-456. PMID 24981792 | 10.3109/21678421.2014.903974 | 진단 지연 중앙값 11.5개월(304명), 대안 진단 52%, 평균 3명의 의사, slurred speech와 빠른 진단의 연관 |
| R2 | Richards D, Morren JA, Pioro EP. Time to diagnosis and factors affecting diagnostic delay in amyotrophic lateral sclerosis. *J Neurol Sci*. 2020;417:117054. PMID 32763509 | 10.1016/j.jns.2020.117054 | 21개 연구 종합, 진단까지 10–16개월 |
| R3 | Falcão de Campos C, Gromicho M, Uysal H, et al. Trends in the diagnostic delay and pathway for amyotrophic lateral sclerosis patients across different countries. *Front Neurol*. 2023;13:1064619. PMID 36733448 | 10.3389/fneur.2022.1064619 | 1,405명, 지연 중앙값 11개월, 바이오마커 필요 |
| R4 | Gwathmey KG, Corcia P, McDermott CJ, et al. Diagnostic delay in amyotrophic lateral sclerosis. *Eur J Neurol*. 2023;30(9):2595-2601. PMID 37209406 | 10.1111/ene.15874 | 지연 원인, 선별·의뢰 도구의 필요 |
| R5 | Jun KY, Park J, Oh KW, et al. Epidemiology of ALS in Korea using nationwide big data. *J Neurol Neurosurg Psychiatry*. 2019;90(4):395-403. PMID 30409890 | 10.1136/jnnp-2018-318974 | 국내 발생률·유병률·생존 |
| R6 | Yunusova Y, Plowman EK, Green JR, Barnett C, Bede P. Clinical measures of bulbar dysfunction in ALS. *Front Neurol*. 2019;10:106. PMID 30837936 | 10.3389/fneur.2019.00106 | 연수 기능 저하의 임상적 중요성과 평가 도구의 한계 |
| R7 | Tena A, Clarià F, Solsona F, Meister E, Povedano M. Detection of bulbar involvement in patients with amyotrophic lateral sclerosis by machine learning voice analysis. *JMIR Med Inform*. 2021;9(3):e21331. PMID 33688838 | 10.2196/21331 | 음성 저하가 연수 침범의 초기 증상 |
| R8 | Stegmann GM, Hahn S, Liss J, et al. Early detection and tracking of bulbar changes in ALS via frequent and remote speech analysis. *NPJ Digit Med*. 2020;3:132. PMID 33083567 | 10.1038/s41746-020-00335-x | 기존 도구의 초기 변화 둔감성, 원격 음성으로 초기 변화 검출 |
| R9 | Neumann M, Kothare H, Ramanarayanan V. Multimodal speech biomarkers for remote monitoring of ALS disease progression. *Comput Biol Med*. 2024;180:108949. PMID 39126786 | 10.1016/j.compbiomed.2024.108949 | ALSFRS-R의 세분성 한계, 자가보고 변화 없이도 음성 지표가 저하를 추적 |
| R10 | Kim KH, Kim RB, Hwang DU, Won SJ, Woo SH. Prevalence of and sociodemographic factors related to voice disorders in South Korea. *J Voice*. 2016;30(2):246.e1-7. PMID 25985718 | 10.1016/j.jvoice.2015.04.010 | 음성 증상이 흔하다는 사실 → 특이도·의뢰 설계 제약 |
| R11 | Sannino G, De Falco I, Brancati N, et al. SAND: The Challenge on Speech Analysis for Neurodegenerative Disease Assessment. *IEEE Open J Signal Process*. 2026;7:766-775 (arXiv:2604.16445); 공식 페이지 | 10.1109/OJSP.2026.3713044 · https://www.sand.icar.cnr.it/ | 데이터셋 구성, Class 정의, 녹음 조건 |
| R12 | Jacobson BH, Johnson A, Grywalski C, et al. The Voice Handicap Index (VHI): development and validation. *Am J Speech Lang Pathol*. 1997;6(3):66-70. PhenX Toolkit PX201301 | https://www.phenxtoolkit.org/protocols/view/201301 | VHI-30 문항·점수 |
| R13 | Javanmardi F, Kadiri SR, Alku P. Pre-trained models for detection and severity level classification of dysarthria from speech. *Speech Commun*. 2024;158:103047 | 10.1016/j.specom.2024.103047 | HuBERT 선택 근거 |
| R14 | Dubbioso R, Spisto M, Verde L, et al. Voice signals database of ALS patients with different dysarthria severity and healthy controls. *Sci Data*. 2024;11:800 | 10.1038/s41597-024-03597-2 | F0 변동성 근거 |
| R15 | Boersma P, Weenink D. Praat: doing phonetics by computer (https://www.praat.org); Jadoul Y, Thompson B, de Boer B. Introducing Parselmouth: A Python interface to Praat. *J Phon*. 2018;71:1-15 | 10.1016/j.wocn.2018.07.001 | Jitter·Shimmer·HNR 산출 방법. 서지는 이번 개정에서 원문 대조하지 않음 |
| S1 | Epic. Help — MyChart | https://www.mychart.org/help | 진료 전 문진(eCheck-In) |
| S2 | Phreesia. Our Patient Intake Platform | https://www.phreesia.com/platform/ | 문진·채점·EHR 연동 |
| S3 | Phreesia. Patient Check-In Software | https://www.phreesia.com/electronic-intake-forms/ | 문진 결과의 EHR 전송 |
| S4 | CHAI Registry. Canary Speech Vocal Biomarker Model for Cognitive Health | https://registry.chai.org/canary-speech/canary-speech-vocal-biomarker-model-for-cognitive- | 음성 분석, 호환 EHR 표기 |
| S5 | App Store. Speech Vitals (Aural Analytics / Linus Health) | https://apps.apple.com/ai/app/speech-vitals/id1501374404 | 연구용 음성 수집 앱 |

## 3. 확인하지 못한 자료

| 자료 | 상태 | 영향 |
|---|---|---|
| 심평원 보건의료빅데이터개방시스템(opendata_visual.hira.or.kr) | TLS 인증서 만료로 접속 실패 | 이전 판의 R49 수치는 배경에서 제외 |
| Epic MyChart 문진 기관별 가이드(WashU PDF 404, U. Iowa 403, Yale 연결 거부) | 접속 실패 | Epic의 문진 → 차트 저장 방식은 "공개 문서로 미확인"으로 표기 |
| Canary Speech–Epic 실제 연동 방식 | 공개 문서 없음 | "호환 EHR 표기, 연동 방식 미공개"로 표기 |
| SAND 원본 음성 | 저장소에 없음 | 외부 수기 특징 단독 기준 모델(eGeMAPS+SVM 등) 재학습은 미수행 |
