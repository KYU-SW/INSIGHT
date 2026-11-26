# HC vs ALS 음성 분류: Baseline 대비 7개 개선 실험 — 자동 생성 연구 보고서
- 실행 ID `20261114T140021_240247Z_LOW_COST` · 모드 **LOW_COST** · LOW_COST 연구 실행
- 생성 시각(UTC) 2026-11-14T15:51:53+00:00
## 1. 연구 배경
ALS의 진행성 마비말장애는 발성·조음에 변화를 일으키며, 음성은 비침습적 바이오마커 후보입니다. 기존 노트북은 동결 HuBERT-large의 4번째 Transformer 블록 출력(hidden_states[4])을 시간 max pooling하여 MLP로 분류했습니다. 본 연구는 이 Baseline을 보존하고, 표현 깊이·시간 집계·다중 모달 융합·목적함수·환자 단위 집계·정규화·인코더 적응의 7개 축에서 각 하나의 방법을 같은 분할과 같은 HPO 예산으로 비교합니다.
## 2. 선행연구 (학술지 우선, 학회/프리프린트는 보조)
| key | type | venue | year | doi | reported | used_in | verification |
|---|---|---|---|---|---|---|---|
| Chen2022WavLM | Journal | IEEE Journal of Selected Topics in Signal Processing 16(6):1505–1518 | 2022 | 10.1109/JSTSP.2022.3188113 | SUPERB에서 HuBERT Large 대비 14개 과제 우위(초록) | EXP01 | web-verified |
| Javanmardi2024SpeCom | Journal | Speech Communication | 2024 | 10.1016/j.specom.2024.103047 | HuBERT 특징이 최적 기준(eGeMAPS 등) 대비 검출 정확도 +1.33~2.86%p, 중증도 +6.54~10.46%p(초록) | EXP01, EXP03 | web-verified |
| Inoue2024ELP | Journal | IEEE/ACM Transactions on Audio, Speech, and Language Processing 32:3867–3880 | 2024 | 10.1109/TASLP.2024.3434445 | WavLM 백본에서 전체 미세조정과 비슷하거나 우수, 학습 파라미터 90% 감소(초록) | EXP01, EXP07 | web-verified |
| Ribas2023Access | Journal | IEEE Access 11:14915–14927 | 2023 | 10.1109/ACCESS.2023.3243986 | SVD 문장 과제 정확도 최대 93.36%(초록) | EXP02 | web-verified (JCR 2023 Q2 표기를 기관 저장소에서 확인) |
| Arevalo2020GMU | Journal | Neural Computing and Applications 32:10209–10228 | 2020 | 10.1007/s00521-019-04559-1 | 단일 모달 및 다른 융합 방식 대비 macro-F1 개선(초록; 수치 원문 미확인) | EXP03 | web-verified |
| Dubbioso2024SciData | Journal | Scientific Data 11:800 | 2024 | 10.1038/s41597-024-03597-2 | F0 표준편차가 ALS 식별·중증도 구분에 우수(초록) | EXP03, EXP05 | web-verified |
| Vashkevich2021BSPC | Journal | Biomedical Signal Processing and Control 65:102350 | 2021 | 10.1016/j.bspc.2020.102350 | 정확도 89.0%(민감도 87.5%, 특이도 90.4%)(초록) | EXP03 (배경) | web-verified |
| Lin2020Focal | Journal | IEEE Transactions on Pattern Analysis and Machine Intelligence 42(2):318–327 | 2020 | 10.1109/TPAMI.2018.2858826 | RetinaNet이 당시 2-stage 검출기 정확도를 넘음(초록) | EXP04 | web-verified |
| Lu2021CLAM | Journal | Nature Biomedical Engineering 5(6):555–570 | 2021 | 10.1038/s41551-020-00682-w | 표준 약지도 분류 대비 우수, 적은 라벨에서도 데이터 효율적(초록) | EXP05 | web-verified |
| Javanmardi2024CSL | Journal | Computer Speech & Language 83:101552 | 2024 | 10.1016/j.csl.2023.101552 | SpecAugment가 두 DB 모두에서 정확도 향상이 가장 컸음(초록) | EXP06 | web-verified |
| Javanmardi2024JBHI | Journal | IEEE Journal of Biomedical and Health Informatics 28(8):4951–4962 | 2024 | 10.1109/JBHI.2024.3392829 | 미세조정 특징이 일반화 우수, 정확도 +1.46~8.65%p(초록) | EXP07 | web-verified |
| Wagner2023TPAMI | Journal | IEEE Transactions on Pattern Analysis and Machine Intelligence 45(9):10745–10759 | 2023 | 10.1109/TPAMI.2023.3263585 | MSP-Podcast valence CCC .638(초록) | EXP07 (배경) | web-verified |
| Hsu2021HuBERT | Journal | IEEE/ACM Transactions on Audio, Speech, and Language Processing 29:3451–3460 | 2021 | 10.1109/TASLP.2021.3122291 | - | 전체 | web-verified (권·쪽수는 확인 필요) |
| Sannino2026SAND | Conference/Preprint | ICASSP 2026 Grand Challenge (arXiv:2604.16445) | 2026 | 10.1109/ICASSP55912.2026.11463257 | - | 데이터 | web-verified (챌린지 사이트에 DOI 표기) |
| Okabe2018ASP | Conference | Interspeech 2018 | 2018 | 10.21437/Interspeech.2018-993 | - | EXP02 | not-verified (이 세션에서 검색 확인 안 함) |
| Ilse2018AMIL | Conference | ICML 2018 (PMLR 80) | 2018 | - | - | EXP05 | not-verified |
| Park2019SpecAug | Conference | Interspeech 2019 | 2019 | 10.21437/Interspeech.2019-2680 | - | EXP06 | not-verified |
| Hu2022LoRA | Conference | ICLR 2022 | 2022 | - | - | EXP07 | not-verified |
| SAND4approaches2025 | Preprint | arXiv preprint | 2025 | - | - | 배경 | web-verified (preprint) |

모든 문헌은 초록·서지 페이지 수준에서 확인했으며 원문 정독 결과가 아닙니다. 원 논문의 성능은 본 데이터에서의 기대 성능이 아닙니다.
## 3. 연구 설계
| split | class | subjects | recordings | mean_duration_sec |
|---|---|---|---|---|
| test | HC | 16 | 128 | 14.978 |
| test | ALS | 25 | 200 | 12.246 |
| train | HC | 74 | 592 | 14.379 |
| train | ALS | 115 | 918 | 13.309 |
| val | HC | 16 | 128 | 18.008 |
| val | ALS | 25 | 198 | 12.954 |

- 분할: 환자 단위 stratified 70/15/15 (seed 42), split hash `9bb28df8f907a9b7`; 이전 Fusion 실행 분할과 일치: **True**
- 누수 방지: 환자 split 중복 검사, scaler는 train fit, 증강은 Train 전용, HPO·early stopping·임계값은 Validation, Test는 설정 고정 후 1회.
## 4. 방법
### 4.1 실험 등록부
| ID | name | axis | change | evidence |
|---|---|---|---|---|
| BASE00 | Baseline (원 설정 재현) | — | 없음: HuBERT-5 max(1024) → MLP(128, dropout 0.1), Adam lr 5e-4, wd 1e-3, batch 64 | Fusion 노트북 |
| BASE01 | Baseline (동일 HPO 예산) | — | 구조 동일, lr/wd/dropout/hidden/batch만 탐색 | 공정 비교 원칙 |
| EXP01 | Learnable layer-weighted aggregation | 표현 깊이 선택 | 25개 hidden state 각각의 시간 mean/max(층별 train 표준화) → softmax 층 가중합 → MLP. 사용할 통계(max/mean/both)와 층 범위를 탐색 | Chen 2022 JSTSP; Javanmardi 2024 SpeCom; Inoue 2024 TASLP (weight tuning) |
| EXP02 | Multi-head attentive statistics pooling | 시간 집계 | HuBERT-5 프레임 → Linear(1024→P) → K-head 어텐션 가중 mean·std → MLP (max 미사용) | Ribas 2023 IEEE Access; Okabe 2018 Interspeech(학회) |
| EXP03 | Gated multimodal fusion (HuBERT + eGeMAPS) | 다중 모달 융합 | h_a=tanh(W_a·HuBERTmax), h_g=tanh(W_g·eGeMAPS88), z=σ(W_z[·;·]), h=z⊙h_a+(1−z)⊙h_g → MLP | Arevalo 2020 NCA; Dubbioso 2024 Sci Data; Vashkevich 2021 BSPC |
| EXP04 | Class-prior focal loss | 학습 목적함수 | Baseline 구조 그대로, 손실만 Focal loss (early stopping 기준은 모든 실험 공통으로 val BCE) | Lin 2020 TPAMI |
| EXP05 | Subject-level gated-attention MIL | 환자 단위 집계 | 환자 = bag(녹음 ≈8개, HuBERT-5 max) + 과제 임베딩(선택) → gated attention → MLP. Train에서만 instance dropout | Lu 2021 Nat Biomed Eng; Ilse 2018 ICML(학회) |
| EXP06 | Latent SpecAugment on frozen HuBERT frames | 정규화/증강 | Train에서만: 프레임 구간 제거(time mask) + 풀링 벡터 채널 마스킹 → masked max → train 통계 표준화 → MLP. 평가 시 마스킹 없음(=Baseline 입력) | Javanmardi 2024 CSL; Park 2019 Interspeech(학회) |
| EXP07 | LoRA adaptation of HuBERT layers 1–4 | 인코더 적응 (PEFT) | HuBERT 1–4층만 남긴 인코더(hidden_states[4]와 수치 동등성 검증)의 q/v(또는 q/k/v/o) 투영에 LoRA, 원 가중치 동결; max pooling + MLP; Train은 무작위 crop, 평가는 발화 전체 | Javanmardi 2024 JBHI; Inoue 2024 TASLP; Wagner 2023 TPAMI; Hu 2022 ICLR(학회) |

### 4.2 저비용 HPO
Optuna TPE(multivariate; 처음 4개 trial은 무작위 = coarse, 이후 TPE = fine) + MedianPruner(이전 trial들의 같은 epoch val 환자 AUROC 중앙값보다 낮으면 중단; startup 4 trial, warmup 3 epoch). 첫 trial은 기본 설정으로 warm start, 같은 설정은 재학습하지 않음. 예산: 일반 12 trial, LoRA 4 trial. 동결 인코더 실험은 특징 캐시를 사용하고 LoRA만 원파형을 사용.
| exp_id | n_trials (budget) | search_space | rationale |
|---|---|---|---|
| BASE00 | 0 | 없음 (고정 설정) | 고정 설정 (HPO 없음) |
| BASE01 | 12 | lr, weight_decay, dropout, hidden, batch_size | Adam lr는 원 설정 5e-4를 중심으로 log 대칭(1e-4–3e-3); L2 1e-5–1e-2; dropout·hidden·batch는 원 MLP 주변 이산값 |
| EXP01 | 12 | lr, wd, dropout, hidden, stats∈{max,mean,meanmax}, layer_range∈{all,0-12,0-8}, weight_temperature | 층 가중합의 핵심 자유도: 통계(max/mean), 층 범위(저·중층 가설: 화자/발성 정보는 하위층, Chen 2022), 가중 softmax 온도 |
| EXP02 | 12 | lr, wd, dropout, hidden, proj_dim, heads, att_dim | 프레임 입력은 기울기 잡음이 커 lr 상한 2e-3·작은 batch; 투영 차원·헤드 수는 ASP 표준 범위(1–4헤드) |
| EXP03 | 12 | lr, wd, dropout, hidden, gmu_dim, modality_dropout | GMU 은닉 차원(Arevalo 2020 범위), 모달 dropout(본 연구 변형, 0 포함 → 원형 GMU도 탐색) |
| EXP04 | 12 | lr, wd, dropout, hidden, gamma, alpha_mode | γ∈{0.5,1,2,3}: Lin 2020이 비교한 범위; α: 클래스 비율 역가중(balanced)/없음/강한 HC 가중 |
| EXP05 | 12 | lr, wd, dropout, hidden, att_dim, task_emb_dim, instance_dropout, batch_subjects | bag 수(train 189명)가 적어 batch 8–32 환자; 과제 임베딩 0이면 순수 MIL; instance dropout은 Train 전용 증강 |
| EXP06 | 12 | lr, wd, dropout, hidden, n_time_masks, time_mask_frac, n_chan_masks, chan_mask_width, p_aug | 마스크 개수·폭은 SpecAugment 관례(짧은 구간 여러 개)를 프레임 길이 비율로 환산; p_aug로 증강 강도 조절 |
| EXP07 | 4 | lr_head, lr_lora, wd, dropout, rank, alpha_ratio, lora_dropout, targets, crop_sec | LoRA rank 4–16·α=r 또는 2r(Hu 2022 관례); LoRA lr은 head보다 낮게; crop 3–6 s(모음 지속 시간 고려); batch 8 고정 |

## 5. 결과
### 5.1 HPO 요약 (Validation)
| exp_id | n_trials_budget | n_complete | n_pruned | n_fail | n_duplicate | hpo_time_s | best_value_val_subject_auroc | best_trial | study | n_total |
|---|---|---|---|---|---|---|---|---|---|---|
| BASE00 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | NA | NA | NA | NA |
| BASE01 | 12 | 9 | 3 | 0 | 0 | 19.000 | 0.925 | 0 | BASE01__LOW_COST__9bb28df8f9__v1 | 12 |
| EXP01 | 12 | 11 | 1 | 0 | 0 | 25.122 | 0.940 | 8 | EXP01__LOW_COST__9bb28df8f9__v1 | 12 |
| EXP02 | 12 | 5 | 7 | 0 | 0 | 227.238 | 0.843 | 2 | EXP02__LOW_COST__9bb28df8f9__v1 | 12 |
| EXP03 | 12 | 6 | 6 | 0 | 0 | 23.234 | 0.910 | 1 | EXP03__LOW_COST__9bb28df8f9__v1 | 12 |
| EXP04 | 12 | 5 | 7 | 0 | 0 | 20.421 | 0.940 | 2 | EXP04__LOW_COST__9bb28df8f9__v1 | 12 |
| EXP05 | 12 | 6 | 6 | 0 | 0 | 23.103 | 0.953 | 2 | EXP05__LOW_COST__9bb28df8f9__v1 | 12 |
| EXP06 | 12 | 12 | 0 | 0 | 0 | 325.222 | 0.948 | 11 | EXP06__LOW_COST__9bb28df8f9__v1 | 12 |
| EXP07 | 4 | 4 | 0 | 0 | 0 | 663.184 | 0.788 | 0 | EXP07__LOW_COST__9bb28df8f9__v1 | 4 |

### 5.2 Test 성능 (환자 단위, seed 앙상블, validation-Youden 임계값)
| exp_id | AUROC | AUPRC | Balanced_Accuracy | Recall_Sensitivity | Specificity | F1 | MCC | Brier | ECE |
|---|---|---|---|---|---|---|---|---|---|
| BASE00 | 0.892 | 0.917 | 0.877 | 0.880 | 0.875 | 0.898 | 0.748 | 0.133 | 0.180 |
| BASE01 | 0.892 | 0.917 | 0.877 | 0.880 | 0.875 | 0.898 | 0.748 | 0.133 | 0.180 |
| EXP01 | 0.900 | 0.931 | 0.838 | 0.800 | 0.875 | 0.851 | 0.660 | 0.133 | 0.129 |
| EXP02 | 0.843 | 0.908 | 0.746 | 0.680 | 0.812 | 0.756 | 0.481 | 0.172 | 0.129 |
| EXP03 | 0.890 | 0.904 | 0.752 | 0.880 | 0.625 | 0.830 | 0.529 | 0.131 | 0.188 |
| EXP04 | 0.895 | 0.923 | 0.815 | 0.880 | 0.750 | 0.863 | 0.638 | 0.149 | 0.136 |
| EXP05 | 0.902 | 0.937 | 0.835 | 0.920 | 0.750 | 0.885 | 0.689 | 0.111 | 0.100 |
| EXP06 | 0.890 | 0.910 | 0.846 | 0.880 | 0.812 | 0.880 | 0.693 | 0.137 | 0.129 |
| EXP07 | 0.840 | 0.908 | 0.718 | 0.560 | 0.875 | 0.683 | 0.435 | 0.175 | 0.099 |

### 5.3 95% 신뢰구간 (클래스 층화 bootstrap)
| exp_id | level | metric | estimate | ci95_low | ci95_high |
|---|---|---|---|---|---|
| BASE00 | subject | AUROC | 0.892 | 0.772 | 0.983 |
| BASE00 | subject | Balanced_Accuracy | 0.877 | 0.766 | 0.969 |
| BASE00 | recording (cluster bootstrap by subject) | AUROC | 0.835 | 0.719 | 0.927 |
| BASE01 | subject | AUROC | 0.892 | 0.772 | 0.983 |
| BASE01 | subject | Balanced_Accuracy | 0.877 | 0.766 | 0.969 |
| BASE01 | recording (cluster bootstrap by subject) | AUROC | 0.835 | 0.719 | 0.927 |
| EXP01 | subject | AUROC | 0.900 | 0.790 | 0.980 |
| EXP01 | subject | Balanced_Accuracy | 0.838 | 0.715 | 0.940 |
| EXP01 | recording (cluster bootstrap by subject) | AUROC | 0.849 | 0.744 | 0.930 |
| EXP02 | subject | AUROC | 0.843 | 0.705 | 0.945 |
| EXP02 | subject | Balanced_Accuracy | 0.746 | 0.613 | 0.869 |
| EXP02 | recording (cluster bootstrap by subject) | AUROC | 0.788 | 0.675 | 0.884 |
| EXP03 | subject | AUROC | 0.890 | 0.762 | 0.985 |
| EXP03 | subject | Balanced_Accuracy | 0.752 | 0.610 | 0.886 |
| EXP03 | recording (cluster bootstrap by subject) | AUROC | 0.844 | 0.728 | 0.935 |
| EXP04 | subject | AUROC | 0.895 | 0.775 | 0.983 |
| EXP04 | subject | Balanced_Accuracy | 0.815 | 0.681 | 0.929 |
| EXP04 | recording (cluster bootstrap by subject) | AUROC | 0.826 | 0.718 | 0.915 |
| EXP05 | subject | AUROC | 0.902 | 0.782 | 0.993 |
| EXP05 | subject | Balanced_Accuracy | 0.835 | 0.710 | 0.949 |
| EXP06 | subject | AUROC | 0.890 | 0.765 | 0.980 |
| EXP06 | subject | Balanced_Accuracy | 0.846 | 0.726 | 0.949 |
| EXP06 | recording (cluster bootstrap by subject) | AUROC | 0.835 | 0.718 | 0.928 |
| EXP07 | subject | AUROC | 0.840 | 0.705 | 0.945 |
| EXP07 | subject | Balanced_Accuracy | 0.718 | 0.586 | 0.840 |
| EXP07 | recording (cluster bootstrap by subject) | AUROC | 0.780 | 0.665 | 0.876 |

### 5.4 BASE01 대비 paired 차이
| exp_id | metric | delta | ci95_low | ci95_high | p_bootstrap(two-sided) | p_holm | interpretation |
|---|---|---|---|---|---|---|---|
| BASE00 | AUROC | 0.000 | 0.000 | 0.000 | 1.000 | NA | 차이 불확실 (CI가 0 포함) |
| BASE00 | Balanced_Accuracy | 0.000 | 0.000 | 0.000 | 1.000 | NA | 차이 불확실 (CI가 0 포함) |
| EXP01 | AUROC | 0.008 | -0.040 | 0.055 | 0.821 | 1.000 | 차이 불확실 (CI가 0 포함) |
| EXP01 | Balanced_Accuracy | -0.040 | -0.100 | 0.000 | 0.231 | 0.924 | 차이 불확실 (CI가 0 포함) |
| EXP02 | AUROC | -0.050 | -0.162 | 0.050 | 0.361 | 1.000 | 차이 불확실 (CI가 0 포함) |
| EXP02 | Balanced_Accuracy | -0.131 | -0.265 | -0.009 | 0.042 | 0.210 | 차이 불확실 (CI가 0 포함) |
| EXP03 | AUROC | -0.002 | -0.030 | 0.032 | 0.929 | 1.000 | 차이 불확실 (CI가 0 포함) |
| EXP03 | Balanced_Accuracy | -0.125 | -0.250 | -0.031 | 0.017 | 0.102 | 차이 불확실 (CI가 0 포함) |
| EXP04 | AUROC | 0.003 | -0.032 | 0.035 | 0.991 | 1.000 | 차이 불확실 (CI가 0 포함) |
| EXP04 | Balanced_Accuracy | -0.062 | -0.156 | 0.000 | 0.234 | 0.924 | 차이 불확실 (CI가 0 포함) |
| EXP05 | AUROC | 0.010 | -0.042 | 0.060 | 0.772 | 1.000 | 차이 불확실 (CI가 0 포함) |
| EXP05 | Balanced_Accuracy | -0.042 | -0.156 | 0.040 | 0.383 | 0.924 | 차이 불확실 (CI가 0 포함) |
| EXP06 | AUROC | -0.002 | -0.025 | 0.020 | 0.965 | 1.000 | 차이 불확실 (CI가 0 포함) |
| EXP06 | Balanced_Accuracy | -0.031 | -0.094 | 0.000 | 0.710 | 0.924 | 차이 불확실 (CI가 0 포함) |
| EXP07 | AUROC | -0.052 | -0.175 | 0.060 | 0.380 | 1.000 | 차이 불확실 (CI가 0 포함) |
| EXP07 | Balanced_Accuracy | -0.160 | -0.291 | -0.037 | 0.014 | 0.098 | 차이 불확실 (CI가 0 포함) |

### 5.5 오류 분석
| exp_id | FP_HC_as_ALS | FN_ALS_as_HC | FN_mean_severity_class |
|---|---|---|---|
| BASE00 | 2 | 3 | 4.000 |
| BASE01 | 2 | 3 | 4.000 |
| EXP01 | 2 | 5 | 4.000 |
| EXP02 | 3 | 8 | 3.875 |
| EXP03 | 6 | 3 | 4.000 |
| EXP04 | 4 | 3 | 4.000 |
| EXP05 | 4 | 2 | 4.000 |
| EXP06 | 3 | 3 | 4.000 |
| EXP07 | 2 | 11 | 3.818 |

중증도별 민감도:
| exp_id | severity_class | n_ALS | sensitivity |
|---|---|---|---|
| BASE00 | 1 | 1 | 1.000 |
| BASE00 | 2 | 5 | 1.000 |
| BASE00 | 3 | 9 | 1.000 |
| BASE00 | 4 | 10 | 0.700 |
| BASE01 | 1 | 1 | 1.000 |
| BASE01 | 2 | 5 | 1.000 |
| BASE01 | 3 | 9 | 1.000 |
| BASE01 | 4 | 10 | 0.700 |
| EXP01 | 1 | 1 | 1.000 |
| EXP01 | 2 | 5 | 1.000 |
| EXP01 | 3 | 9 | 1.000 |
| EXP01 | 4 | 10 | 0.500 |
| EXP02 | 1 | 1 | 1.000 |
| EXP02 | 2 | 5 | 1.000 |
| EXP02 | 3 | 9 | 0.889 |
| EXP02 | 4 | 10 | 0.300 |
| EXP03 | 1 | 1 | 1.000 |
| EXP03 | 2 | 5 | 1.000 |
| EXP03 | 3 | 9 | 1.000 |
| EXP03 | 4 | 10 | 0.700 |
| EXP04 | 1 | 1 | 1.000 |
| EXP04 | 2 | 5 | 1.000 |
| EXP04 | 3 | 9 | 1.000 |
| EXP04 | 4 | 10 | 0.700 |
| EXP05 | 1 | 1 | 1.000 |
| EXP05 | 2 | 5 | 1.000 |
| EXP05 | 3 | 9 | 1.000 |
| EXP05 | 4 | 10 | 0.800 |
| EXP06 | 1 | 1 | 1.000 |
| EXP06 | 2 | 5 | 1.000 |
| EXP06 | 3 | 9 | 1.000 |
| EXP06 | 4 | 10 | 0.700 |
| EXP07 | 1 | 1 | 1.000 |
| EXP07 | 2 | 5 | 1.000 |
| EXP07 | 3 | 9 | 0.778 |
| EXP07 | 4 | 10 | 0.100 |

### 5.6 계산 비용
| exp_id | status_final | hpo_trials_total | hpo_complete | hpo_pruned | hpo_failed | hpo_duplicates_skipped | hpo_wall_time_min | final_train_time_s_mean | final_best_epoch_mean | peak_gpu_mem_MB_max | params_total | params_trainable | test_inference_ms_per_recording | test_subject_AUROC |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BASE00 | COMPLETED | 0 | 0 | 0 | 0 | 0 | 0.000 | 0.634 | 4.000 | 596.440 | 131329.000 | 131329.000 | 0.028 | 0.892 |
| BASE01 | COMPLETED | 12 | 9 | 3 | 0 | 0 | 0.317 | 0.589 | 4.000 | 596.440 | 131329.000 | 131329.000 | 0.035 | 0.892 |
| EXP01 | COMPLETED | 12 | 11 | 1 | 0 | 0 | 0.419 | 0.822 | 1.333 | 628.536 | 524810.000 | 524810.000 | 0.037 | 0.900 |
| EXP02 | COMPLETED | 12 | 5 | 7 | 0 | 0 | 3.787 | 19.263 | 1.333 | 1572.237 | 164354.000 | 164354.000 | 2.094 | 0.843 |
| EXP03 | COMPLETED | 12 | 6 | 6 | 0 | 0 | 0.387 | 1.377 | 3.000 | 599.387 | 293377.000 | 293377.000 | 0.038 | 0.890 |
| EXP04 | COMPLETED | 12 | 5 | 7 | 0 | 0 | 0.340 | 1.138 | 7.333 | 596.440 | 131329.000 | 131329.000 | 0.032 | 0.895 |
| EXP05 | COMPLETED | 12 | 6 | 6 | 0 | 0 | 0.385 | 1.547 | 4.333 | 602.054 | 363458.000 | 363458.000 | 0.394 | 0.902 |
| EXP06 | COMPLETED | 12 | 12 | 0 | 0 | 0 | 5.420 | 22.156 | 2.333 | 1081.221 | 65665.000 | 65665.000 | 1.964 | 0.890 |
| EXP07 | COMPLETED | 4 | 4 | 0 | 0 | 0 | 11.053 | 165.371 | 2.000 | 1658.635 | 63774593.000 | 262401.000 | 43.742 | 0.840 |

## 6. 통계 분석 방법
환자 단위 seed 앙상블 확률에 대해 클래스 층화 bootstrap 2000회로 95% CI를 구했고, 비교는 같은 재표집 인덱스의 paired bootstrap Δ로 계산했습니다. 사전 지정 판정 기준: Bonferroni(×7) CI가 0을 제외할 때만 개선/악화로 표기합니다. Holm 보정 bootstrap p와 McNemar exact p는 보조 정보입니다.
## 7. 주요 발견 — 가설 · 관측 · 해석 구분
- **EXP01 가설**: ALS 단서(발성·조음)는 특정 한 층(4번째 블록)이 아니라 여러 층에 분산되어 있어, 학습형 층 가중합이 단일 층보다 판별 정보를 더 보존한다.
  - 관측: Test 환자 AUROC 0.900 [0.790, 0.980]; Δ vs BASE01 +0.008 [-0.040, +0.055]
- **EXP02 가설**: max pooling은 극단값 한 프레임만 남긴다. 병리 단서가 있는 구간에 가중치를 주는 어텐션 평균·표준편차가 더 안정적인 발화 표현을 만든다.
  - 관측: Test 환자 AUROC 0.843 [0.705, 0.945]; Δ vs BASE01 -0.050 [-0.162, +0.050]
- **EXP03 가설**: eGeMAPS(F0·jitter·shimmer 등)는 HuBERT와 보완적이며, 입력마다 모달 기여도를 조절하는 게이트가 단순 연결보다 잡음 특징의 영향을 줄인다.
  - 관측: Test 환자 AUROC 0.890 [0.762, 0.985]; Δ vs BASE01 -0.002 [-0.030, +0.032]
- **EXP04 가설**: HC(39%)·경계 사례가 BCE에서 과소 학습된다. α·(1−p_t)^γ 가중이 소수 클래스와 어려운 녹음에 학습을 집중시켜 특이도·balanced accuracy를 개선한다.
  - 관측: Test 환자 AUROC 0.895 [0.775, 0.983]; Δ vs BASE01 +0.003 [-0.032, +0.035]
- **EXP05 가설**: 진단 정보는 환자의 일부 과제(예: DDK 또는 특정 모음)에 집중된다. 녹음별 확률 평균 대신 환자의 녹음 묶음을 어텐션으로 집계하면 환자 판정이 개선된다.
  - 관측: Test 환자 AUROC 0.902 [0.782, 0.993]; Δ vs BASE01 +0.010 [-0.042, +0.060]
- **EXP06 가설**: train 189명에서 MLP가 녹음 특이적 극단 프레임에 과적합한다. 시간·채널 마스킹으로 max 풀링 입력을 교란하면 일반화가 좋아진다.
  - 관측: Test 환자 AUROC 0.890 [0.765, 0.980]; Δ vs BASE01 -0.002 [-0.025, +0.020]
- **EXP07 가설**: ASR 미세조정 체크포인트의 하위 층은 병리 단서를 일부 억제한다. 저랭크 적응으로 인코더를 소폭 조정하면 과적합 없이 판별력이 오른다.
  - 관측: Test 환자 AUROC 0.840 [0.705, 0.945]; Δ vs BASE01 -0.052 [-0.175, +0.060]
- 관측: Test 환자 AUROC 점추정 최고는 EXP05 (0.902 [0.782, 0.993]). 단, 점추정 순위는 41명 수준의 Test에서 불안정합니다.
- 관측: BASE01 대비 어떤 실험도 AUROC 차이의 Bonferroni 보정 CI가 0을 제외하지 않았습니다 → 통계적으로 확실한 개선을 주장할 수 없습니다.
- 관측: BASE00(원 설정 재현) Test 환자 AUROC 0.892 [0.772, 0.983]; 원 Fusion 노트북 보고값은 0.890±0.003 (seed 5개 평균, 단일 seed 지표).
- 해석(연구자 판단 필요): 위 관측은 단일 고정 분할에 대한 결과이며, 개선/악화의 원인은 각 실험 가설(Experiment Registry)과 오류 분석을 함께 보고 판단해야 합니다.

## 8. 한계
- **단일 분할**: 환자 단위 70/15/15 분할 1개(SPLIT_SEED=42); Test 41명. 분할 변동성은 CI에 반영되지 않음 → 반복 그룹 k-fold 권장.
- **Validation 재사용**: HPO·early stopping·임계값 선택에 같은 Validation(41명 내외)을 사용 → Validation 성능은 낙관적. Test는 선택에 사용하지 않음.
- **HPO 예산**: LOW_COST: trial 12개(LoRA 4개). 탐색 공간 대비 작아 최적 설정 보장 없음.
- **이전 선택 편향**: 원 노트북의 층(HuBERT-5)·pooling·head는 이전 노트북에서 선택됨. Test를 보고 선택했는지 코드로 확인 불가(A4).
- **eGeMAPS 캐시**: NaN/inf가 표준화 전 0으로 치환되어 저장됨(A5) → EXP03 해석 시 0 비율 표 참고.
- **외적 타당도**: SAND/VOC-ALS 단일 기관·이탈리아어·스마트폰 녹음. 다른 언어·기기·기관으로 일반화 미검증.
- **이진화**: 공식 Task 1은 5-class(중증도). 본 연구는 Class 1–4를 ALS로 묶은 이진 분류.
- **통계**: bootstrap p값은 근사치이며, 사전에 정한 Bonferroni CI 기준 외의 유의성 주장은 하지 않음.
- **문헌**: 문헌은 초록·서지 수준에서 확인. SCI/SCIE 등재 여부는 Clarivate MJL로 공식 확인하지 않음.

## 9. 향후 연구
- 반복 환자 단위 그룹 k-fold로 분할 변동 포함
- 효과가 관측된 축의 사전 등록 조합
- 5-class 중증도·외부 데이터 검증

## 부록: 그림
- `plots/00_eda_overview.png` — Split·녹음 수·과제별 길이·Class 분포
- `plots/00_eda_demographics.png` — 성별·나이 (라벨 시트에 있을 때)
- `plots/01_hpo_optimization_history.png` — 실험별 Optuna trial 값과 누적 최고값 (Validation 환자 AUROC)
- `plots/02_training_curves.png` — 최종 학습 곡선 (첫 seed)
- `plots/03_roc_pr_test_subject.png` — Test 환자 단위 ROC·PR 곡선
- `plots/04_calibration.png` — 보정 곡선(5 bins, 환자 41명 기준이라 불안정)
- `plots/05_confusion_matrices.png` — 환자 단위 혼동행렬 (임계값은 Validation에서 결정)
- `plots/06_test_auroc_forest.png` — Test 환자 AUROC와 95% CI
- `plots/07_delta_vs_comparator.png` — BASE01 대비 paired bootstrap 차이
- `plots/08_cost_vs_performance.png` — 복잡도·계산 비용 대비 성능
- `plots/09_metric_heatmap.png` — Test 지표 히트맵
- `plots/10_seed_variability.png` — 학습 seed별 Test AUROC
- `plots/11_exp01_layer_weights.png` — EXP01 학습된 층 가중치
- `plots/12_exp03_gate_distribution.png` — EXP03 게이트 분포
- `plots/13_exp05_attention_by_task.png` — EXP05 과제별 평균 어텐션
- `plots/14_sensitivity_by_severity.png` — ALS 중증도 Class별 민감도
- `plots/15_task_auroc.png` — 과제별 녹음 단위 AUROC
- `plots/16_error_overlap.png` — 방법 간 공통 오분류 환자

## 부록: 재현성
- 환경: `logs/environment_manifest.json`, 설정: `experiment_config.json`, 최적 파라미터: `best_params.json`, Optuna DB: `hpo/optuna.db`
