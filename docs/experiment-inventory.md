# Google Drive 실험 결과 전수 목록 (Experiment Inventory)

- 작성일: 2026-11-26
- 조사 대상: Google Drive 최상위 폴더 3개 — `2026_2_INSIGHT`, `2026_2_INSIGHT_실험정리_20261115`, `Vocal_Classification`
- 조사 방법: Google Drive 커넥터의 제목·MIME·생성시각 검색으로 폴더와 결과 파일(CSV/JSON/MD)을 열거하고, 지표를 담은 소형 파일을 내려받아 직접 읽었다. 본 문서의 모든 수치는 내려받거나 열람한 파일에서 옮긴 값이다. 파일에서 확인하지 못한 수치는 적지 않았다.
- 배포 모델 기준: `facebook/hubert-large-ls960-ft` hidden_states[7] (paper_layer 8) + 시간 max pooling + MLP, 분할 `split_hash = 9bb28df8f907…` (환자 단위 70/15/15, seed 42, test 41명/328 녹음).

> 표기 규칙: `AVA` = `MyDrive/2026_2_INSIGHT/ALS_RESULTS/ALS_voice_analysis_20260921_075155`. "hidden_index"는 `hidden_states` 인덱스(0 = CNN 특징 투영 출력)이며, 원 노트북의 "paper_layer"는 hidden_index + 1이다. 녹음 단위 = recording, 환자 단위 = subject.

## 1. 마스터 표

| 실험 ID | 날짜(UTC) | 변경 요인 | 분할 | seed | 주요 지표 (출처 파일) | 완료 여부 | 로컬 사본 경로 |
|---|---|---|---|---|---|---|---|
| HUBERT_PAPER_REPRODUCTION / 20261005T055211_070474Z (배포 가중치 학습 실행) | 2026-10-05 | 층 0–24 × pooling {mean, max, mean_std} × head {MLP, CNN}, 검증 ACC 최대 층 선택. 특징 캐시 v1 (transformers 4.57.1) | 9bb28df8 | 42 (단일) | MLP+max 선택 층 h7: val ACC 73.31%, test 녹음 ACC 75.30%, SE 0.860, SP 0.586, F1 0.809, EER 0.234. 6개 조합 중 test ACC 최고는 CNN+max h5 78.35% (`test_selected_layers.csv`) | 완료 (`COMPLETED.json`: 6 조합, 150 layer run) | `provenance/run_20261005T055211_070474Z/` |
| HUBERT_PAPER_REPRODUCTION / 20261005T080540_357849Z | 2026-10-05 | 위와 동일 설계의 재실행. 특징 캐시 v2 (transformers 5.18.0). config에 `attention` pooling이 추가되었으나 결과 표에는 mean/max/mean_std만 존재 | 9bb28df8 | 42 (단일) | MLP+max 선택 층 h4: val ACC 75.15%, test ACC 78.35%, SE 0.850, SP 0.680, F1 0.827, EER 0.235. 같은 실행의 h7: test ACC 78.05%, SE 0.885, SP 0.617 (`test_all_layers.csv`) | 완료 (`COMPLETED.json`: 6 조합, 150 layer run) | `provenance/run_20261005T080540_357849Z/` |
| HUBERT_PAPER_REPRODUCTION / 20261005T215051_337316Z | 2026-10-05 | pooling에 attention 추가 (heads MLP/CNN), 특징 v2 | 9bb28df8 | 42 | 결과 표 없음 (`run_config.json`, `split_manifest.csv`, `audio_audit.csv`만 존재) | 부분 실행 (COMPLETED.json 없음) | `provenance/run_20261005T215051_337316Z/` (config만) |
| HUBERT_EGEMAPS_FUSION / 20261029T002532_321288Z | 2026-10-29 | HuBERT h4 max + eGeMAPS: Baseline / Concat / CoAttention, head_dropout 0.3 | 9bb28df8 | 42–46 (5) | Baseline 녹음 AUC 0.831±0.006, subj_AUC 0.891±0.002; Concat AUC 0.845±0.004, subj_AUC 0.902±0.006; CoAttention AUC 0.840±0.005 (`summary_mean_std.csv`) | 완료 | `provenance/HUBERT_EGEMAPS_FUSION_20261029T002532_321288Z/` |
| HUBERT_EGEMAPS_FUSION / 20261029T022505_064048Z | 2026-10-29 | 위와 동일, head_dropout 0.1 | 9bb28df8 | 42–46 (5) | Baseline AUC 0.830±0.005, subj_AUC 0.890±0.003; Concat AUC 0.845±0.003; CoAttention AUC 0.842±0.008 | 완료 | `provenance/HUBERT_EGEMAPS_FUSION_20261029T022505_064048Z/` |
| HUBERT_EGEMAPS_FUSION / 20261112T011348_511305Z (Selected3) | 2026-11-12 | 위 3개 + Late3 / Early3 / EarlyHuBERTonly (선택 eGeMAPS 3개, pooling 전/후 결합) | 9bb28df8 | 42–46 (5) | Baseline ACC 78.293±0.899%, AUC 0.830±0.005, subj_AUC 0.890±0.003; Early3 ACC 79.512±0.950%, AUC 0.857±0.006, subj_AUC 0.901±0.004; Late3 AUC 0.835±0.010 (`summary_mean_std.csv`) | 완료 | `provenance/HUBERT_EGEMAPS_FUSION_20261112T011348_511305Z/` |
| HUBERT_ALS_7EXP_HPO / 20261114T140021_240247Z_LOW_COST | 2026-11-14 | BASE00/BASE01 (h4 max MLP) 대비 EXP01 층가중, EXP02 attentive statistics, EXP03 gated fusion, EXP04 focal, EXP05 MIL, EXP06 latent SpecAugment, EXP07 LoRA; Optuna 12 trial (LoRA 4) | 9bb28df8 | 42–44 (3) | Test 환자 seed 앙상블 AUROC: BASE00 0.892, EXP01 0.900, EXP02 0.843, EXP03 0.890, EXP04 0.895, EXP05 0.902, EXP06 0.890, EXP07 0.840. BASE00 BA 0.877, SE 0.880, SP 0.875. BASE01 대비 Bonferroni CI가 0을 제외한 실험 없음 (`research_report.md`) | 완료 (`experiment_status.csv`: 9/9 COMPLETED, 각 3 seed) | `provenance/run_20261114T140021_240247Z_LOW_COST/` |
| ML_EXPERIMENT_01 | 2026-09-23 | 수작업 음향 특징 65개 + M0 Majority / M1 ElasticNet / M2 GlobalXGB / M3 TaskConcatXGB / M4 TaskStackXGB | SAND 공식 train 219명 / validation 53명 (4-fold OOF + 공식 validation) | 42 | validation: M1 AUROC 0.838, BA 0.755, SE 0.844, SP 0.667; M3 AUROC 0.798; M4 AUROC 0.759. train OOF: M4 AUROC 0.761, M1 0.704 (`01_model_metrics.csv`) | 결과 완비 (COMPLETED 파일 개념 없음) | `provenance/ML_EXPERIMENT_01/` |
| ML_EXPERIMENT_02 | 2026-09-23 | 위 모델군 + 5회 반복 OOF, Platt 보정, 임계값 규칙 2종, M5 융합, bootstrap 2000 | 공식 train/validation (위와 동일) | 42 | validation(BA 임계값): M1 AUROC 0.838, BA 0.755, SE 0.844, SP 0.667; M3 AUROC 0.798, BA 0.757; M4 AUROC 0.768, BA 0.741. M1 validation AUROC 0.837 [0.707, 0.939] (`01_metrics.csv`, `04_bootstrap_CI.csv`) | 결과 완비 | `provenance/ML_EXPERIMENT_02/` |
| ML_EXPERIMENT_T1_WAVLM_FROZEN_ELASTICNET | 2026-09-24 | 인코더 교체: frozen `microsoft/wavlm-base-plus` 마지막 층 frame mean → 환자 8과제 평균 → ElasticNet | 공식 train/validation (위와 동일) | 42 | validation AUROC 0.832, BA 0.795, SE 0.875, SP 0.714; AUROC 0.830 [0.708, 0.932]; M1 대비 ΔAUROC −0.009 [−0.161, 0.134]. train OOF AUROC 0.699 (`02_metrics.csv`, `06_bootstrap_CI.csv`, `08_paired_T1_vs_M1.csv`) | 결과 완비 | `provenance/ML_EXPERIMENT_T1_WAVLM_FROZEN_ELASTICNET/` |
| Data2Vec_Audio_Base | 2026-09 (정확한 일자 미확인) | `facebook/data2vec-audio-base-960h` 미세조정 (마지막 4층, 30 epoch) | VOC-ALS 메타데이터 기반 별도 분할 `subject_splits_seed_2026` | 2026 | test(23명): AUROC 0.589, SE 1.000, SP 0.000, ACC 0.696 — 모든 대상을 ALS로 예측한 퇴화 결과 (`test_metrics.json`) | 결과 파일은 있으나 노트북 미확인 | `provenance/Data2Vec_Audio_Base/` |
| EGEMAPS_GROUP_ANALYSIS / 20261112T003857_592281Z | 2026-11-12 | 분류기 아님. eGeMAPSv02 88개 특징의 ALS vs HC 통계 비교 (FDR, Cliff's delta, 단일 특징 AUC, sex/age 보정) | 분할 없음 (전체 2,164 녹음, HC 106 / ALS 165명) | — | FDR q<0.05 유의 특징 27/88; 공변량 보정 후 32/88; 최대 효과 F0semitone_pctlrange0-2 (delta +0.45, 단일 특징 AUC 0.72) (`summary.md`) | 완료 | `provenance/EGEMAPS_GROUP_ANALYSIS_20261112T003857_592281Z/` |
| ANALYZE (통계 분석) | 2026-09-22 | 초기 특징의 그룹 검정·결측 분석 | 분할 없음 | — | 미열람 (CSV 15개, xlsx 1개) | 결과 존재 | 사본 없음 |
| Vocal_Classification / Result (약 50개 실행) | 2026-10-26 – 2026-11-22 | VGGish/SupCon/eGeMAPS/증강/적대학습 등 | **SVD(Saarbrücken Voice Database) 음성장애 과제** — healthy vs disordered, HD vs VFP. ALS/SAND 아님 | 42 등 | 범위 외로 지표 미추출 | 다수 완료 | 사본 없음 |

### 1.1 분할 관계 (본 조사에서 계산한 파생 관측)

`ML_EXPERIMENT_01/00_patient_labels_and_splits.csv`의 `official_split` 열과 배포 실행의 `split_manifest.csv`를 환자 ID로 대조하였다(연령·성별 열은 사용·복사하지 않음). 공식 validation 53명 중 35명은 9bb28df8 분할의 train, 7명은 val, 11명은 test에 속한다. 반대로 9bb28df8 test 41명 중 30명은 공식 train에 속한다. 따라서 ML_EXPERIMENT_01/02와 T1(WavLM)의 수치는 배포 모델의 test 수치와 같은 평가 집합에서 얻은 값이 아니며, 서로의 평가 집합이 상대 모델의 학습 집합과 겹친다. 두 계열의 수치를 직접 비교하면 안 된다.

## 2. 질문별 답변

### (a) 수작업 특징 단독 기준선 (independent baseline)

- **존재한다.** `ML_EXPERIMENT_01`, `ML_EXPERIMENT_02`가 수작업 음향 특징(F0 평균·표준편차, jitter, HNR, 포먼트 F1–F3, MFCC 1–13 평균·표준편차, 휴지 통계, 에너지, 스펙트럼 통계 등 65개; `08_feature_importance.csv`의 feature 열로 확인)만으로 ElasticNet·XGBoost를 학습한다. 특징 추출 설정(13 MFCC, Praat/parselmouth pitch 60–500 Hz, pause 30 dB)은 `drive_notes/ALS_voice_analysis_20260921_075155__run_summary.json`에 있다.
- 대표 수치(공식 validation 53명, 환자 단위): M1 ElasticNet AUROC 0.838, BA 0.755, SE 0.844, SP 0.667; bootstrap AUROC 0.837 [0.707, 0.939].
- **동일 분할이 아니다.** 9bb28df8이 아닌 SAND 공식 train/validation 분할을 사용한다(1.1절 참조). 9bb28df8 test 41명에서 수작업 특징 단독 분류기를 평가한 결과 파일은 찾지 못했다.
- eGeMAPS는 9bb28df8 분할에서 HuBERT와의 **융합** 형태로만 학습되었다(HUBERT_EGEMAPS_FUSION, 7EXP의 EXP03). eGeMAPS 단독 분류기의 결과는 발견되지 않았다. EGEMAPS_GROUP_ANALYSIS의 단일 특징 AUC는 전체 데이터에 대한 기술 통계이며, 보류 집합 성능이 아니다.

### (b) 다른 인코더

- **WavLM**: `ML_EXPERIMENT_T1_WAVLM_FROZEN_ELASTICNET` (frozen wavlm-base-plus, validation AUROC 0.832). 공식 분할 사용. `ALS_Transformer_Model_Bundle/bundle_manifest.json`에 T2–T5(HuBERT+ElasticNet, WavLM+MLP 등)가 "planned"로만 기재되어 있고 결과는 없다.
- **Data2Vec**: `Data2Vec_Audio_Base` (미세조정, 별도 seed-2026 분할, test AUROC 0.589, SP 0.000). 생성 노트북은 Drive에서 확인되지 않는다(`drive_notes/정리본_안내와_검증범위.md`도 같은 내용을 기록).
- **wav2vec2 / Whisper**: ALS(SAND) 과제에 대한 결과는 발견되지 않았다. `Vocal_Classification`의 SSL-MultiRec 실행에 hubert·wavlm·wav2vec2 attention 그림이 있으나 SVD 음성장애 데이터셋이다.

### (c) 층 탐색과 pooling 비교

- **층 탐색**: HUBERT_PAPER_REPRODUCTION 두 완료 실행이 hidden_index 0–24 전체에 대해 6개 head×pooling 조합을 학습했다(`validation_all_layers.csv`, `test_all_layers.csv`, 각 150행). MLP+max만 보면 055211 실행은 test ACC 67.07–76.83%, 080540 실행은 65.85–78.35% 범위이다. 검증 ACC로 고른 층은 055211에서 h7, 080540에서 h4로 **실행마다 달랐다**. 두 실행은 split_hash와 seed가 같고 특징 캐시 버전(transformers 4.57.1 vs 5.18.0)이 다르다.
- **pooling 비교**: mean / max / mean_std × MLP / CNN이 위 두 실행에 있다. attention pooling은 080540·215051 config에 포함되었으나 완료 결과가 없다. 7EXP의 EXP02(multi-head attentive statistics pooling, h4 frame)는 test 환자 AUROC 0.843 [0.705, 0.945]로 BASE01(0.892)보다 낮았고, Bonferroni 기준으로 유의한 차이는 아니다. EXP01(학습형 층 가중합)은 0.900 [0.790, 0.980].
- statistical pooling 단독(mean+std)은 mean_std 조합으로, attentive statistics는 EXP02로 각각 1회씩만 존재한다. temporal-difference pooling 결과는 없다.

### (d) 배포 구성(h7 + max + MLP)의 다중 seed 결과

- **없다.** 다중 seed 실행(Fusion 5 seed, 7EXP 3 seed)은 모두 hidden_states[4](paper_layer 5) + max + MLP를 Baseline으로 사용한다. 이 h4 구성의 결과: 7EXP BASE00 test 환자 앙상블 AUROC 0.892 [0.772, 0.983]; Fusion Selected3 Baseline 5 seed subj_AUC 0.890±0.003, 녹음 AUC 0.830±0.005.
- h7 + max + MLP는 seed 42 단일 학습으로 두 번 존재한다: 055211(배포, test ACC 75.30%)과 080540(특징 v2, test ACC 78.05%). 이 차이는 seed 변동이 아니라 특징 추출 환경 차이를 포함한 재실행 차이이며, 원인은 측정되지 않았다.
- 따라서 배포 구성의 seed 분산을 보고하려면 h7 구성으로 새로 학습해야 한다. h4 결과를 배포 모델의 신뢰구간으로 대체하면 안 된다.

### (e) 특징 캐시

| 캐시 | 위치 | 내용 (feature_spec / metadata 기준) | 확인한 규모 | 비고 |
|---|---|---|---|---|
| `00fcfa559a73d004ab9d` | `AVA/HUBERT_PAPER_FEATURE_CACHE_V1/00fcfa559a73d004ab9d/` | hubert-large-ls960-ft, 층 0–24, feature version 1 (transformers 4.57.1) — 배포 실행(055211)과 같은 버전 | 녹음별 npz 약 373 KB. 생성 시각 창 검색으로 **최소 767개, 286.0 MB** 확인 | 열거 미완료. train/val/test 구분 없이 녹음 해시로 저장 |
| `37e7a72226d75ff12b11` | `AVA/HUBERT_PAPER_FEATURE_CACHE_V1/37e7a72226d75ff12b11/` | 같은 모델, feature version 2 (transformers 5.18.0) — 080540 실행용 | npz 1개당 약 33–60 MB. **최소 779개, 52,576.8 MB** 확인 | 열거 미완료 (프레임 단위 전층 캐시로 추정; 미검증) |
| HUBERT_ALL_LAYERS_POOLED_CACHE_V1 | `AVA/HUBERT_ALL_LAYERS_POOLED_CACHE_V1/` | 7EXP용 층별 pooled 캐시 (메타데이터 파일 미발견) | 첫 페이지 300개, 61.5 MB | 열거 미완료 |
| HUBERT_L04_MAX_FRAMES_CACHE | `AVA/HUBERT_L04_MAX_FRAMES_CACHE/` | h4 프레임 캐시 (Fusion용으로 추정) | 녹음별 약 0.8–1.4 MB, 개수 미확인 | 열거 미완료 |
| EGEMAPS_V02_CACHE | `AVA/EGEMAPS_V02_CACHE/` | eGeMAPSv02 LLD/functionals (추정) | 녹음별 약 80–200 KB, 개수 미확인 | 열거 미완료 |
| TRANSFORMER_SHARED_CACHE | `AVA/TRANSFORMER_SHARED_CACHE/wavlm_base_plus_last_mean_recordings.npz` | WavLM base plus 마지막 층 mean, 2,176 녹음, 768차원 | 단일 파일 6,231,333 B | 메타데이터 사본: `provenance/ML_EXPERIMENT_T1_WAVLM_FROZEN_ELASTICNET/` |

- 로컬에는 기존 `provenance/run_20261005T055211_070474Z/test_features_h07_max.npz`(test 전용)만 있다. train/val 특징은 위 Drive 캐시에만 있으며, 디스크 여유(약 1 GB)와 50 MB 상한 때문에 내려받지 않았다. 00fcfa 캐시에서 h7 max만 재구성하려면 녹음별 npz 전체(추정 0.8 GB 내외, 미확인)를 읽어야 한다.

## 3. 열지 못했거나 열지 않은 항목

- **열거 미완료**: Drive 커넥터는 `parentId`/`ancestors` 질의에서 페이지당 5개만 반환한다. 그래서 캐시 폴더의 파일 수와 총 용량은 생성시각 창 검색으로 얻은 하한값이다.
- **내용 미열람**: 모든 `.xlsx`(예: `ALS_HC_7EXP_research_results.xlsx`, `ALS_model_experiment_02_results.xlsx`, `T1_FrozenWavLM_ElasticNet_results.xlsx`, `ALS_HC_voice_analysis.xlsx`), 모든 `.ipynb`, `hpo/optuna.db`, HUBERT_PAPER_REPRODUCTION 층별 head 폴더의 `history.csv`/`validation.json`(141쌍 이상), 예측 CSV(`test_predictions*.csv`, `all_predictions_val_test.csv`, `patient_level_predictions.csv`), `interpretability.json`, `all_results_metrics_long.csv`, EGEMAPS_GROUP_ANALYSIS의 `stats_*.csv`, ANALYZE 폴더의 CSV.
- **범위 외**: `Vocal_Classification` 전체(SVD 음성장애 데이터셋; `20261026_024942_a_n_ExpB/config.json` 1건만 열어 데이터셋을 확인함). `2026_2_INSIGHT_실험정리_20261115`의 ZIP 묶음은 위 원본의 보존용 사본이므로(`drive_notes/정리본_안내와_검증범위.md`) 열지 않았다.
- **의도적으로 복사하지 않음**: 연령·성별을 포함한 `00_patient_labels_and_splits.csv`, 환자 ID별 예측표, 원시 오디오, `SAND_Challenge_task1_dataset.zip`(414,967,395 B), 모델 가중치(`model.pt`, `head.pt`).

## 4. 해석상 주의

- 7EXP와 Fusion의 "Baseline"은 h4이고 배포 모델은 h7이다. 두 값을 같은 모델의 반복 측정으로 취급하면 안 된다.
- 층 선택은 단일 validation 집합(41명)의 ACC로 이루어졌고, 같은 seed·split에서도 특징 추출 환경에 따라 선택 층이 h7↔h4로 바뀌었다. 선택된 층이 안정적이라는 근거는 현재 없다.
- 7EXP 보고서도 단일 분할, validation 재사용, 이전 노트북의 층·pooling 선택 편향을 한계로 명시한다(`research_report.md` 8절).
- 수작업 특징 기준선(ML_EXPERIMENT_01/02)의 validation AUROC 0.838과 HuBERT 계열의 test AUROC 0.89 내외는 평가 집합과 집계 방식이 달라 비교할 수 없다. 동일 9bb28df8 분할에서 수작업 특징 단독 모델을 학습·평가하는 실험이 필요하다.
