# h7 다중 seed 재학습과 검증 분할 기반 OOD 보정

**목적.** 배포 구성(HuBERT h07 + 시간축 max pooling + MLP)은 seed 42 한 번만 학습되었다. OOD 임계값도 시험 특징 4개로 정했다. 이 스크립트는 같은 피험자 분할(9bb28df8)에서 다음 두 가지를 함께 계산한다.

1. 배포 레시피 그대로 seed 42–46을 학습하고 다음을 산출한다.
   - 녹음·피험자 단위 지표의 평균 ± SD
   - seed 앙상블의 피험자 AUROC와 그 bootstrap 95% CI
2. 검증 분할 거리의 99 백분위로 OOD 임계값을 정하고, 학습·검증·시험 분할의 오거부율을 산출한다. 시험 분할은 임계값 선택에 쓰지 않는다.

**입력.** Drive `HUBERT_ALL_LAYERS_POOLED_CACHE_V1`는 녹음당 `<sample_id>.npz` 파일이며, `pooled`의 형태는 (25, 2, 1024)이다. h07 max 특징은 `pooled[7, 1]`이다.
- 이 특징을 `provenance/run_20261005T055211_070474Z/test_features_h07_max.npz`와 대조했다. 최대 차이는 7.3×10⁻⁵이고, 특징 크기는 약 80이다.
- 시험 녹음 2개에서 저장된 배포 확률이 재현되었다.

**실행 (Colab, Drive 마운트).** 파일이 2,164개로 나뉘어 있어 로컬 도구로는 받기 어렵다.

```sh
python experiments/h7_multiseed/run_h7_multiseed.py \
  --cache-dir "/content/drive/MyDrive/2026_2_INSIGHT/ALS_RESULTS/ALS_voice_analysis_20260921_075155/HUBERT_ALL_LAYERS_POOLED_CACHE_V1" \
  --out experiments/h7_multiseed
```

**결과 파일.** `results.json`과 통합 특징 파일 `h07_max_9bb28df8.npz`(약 9 MB)가 생긴다. 이후에는 `--features` 옵션으로 통합 파일을 바로 쓸 수 있다.

**검증 상태.**
- 합성 캐시(2,164개, 시험 4개는 실제 provenance 특징)로 두 입력 경로가 모두 동작함을 확인했다.
- 실제 데이터 결과는 아직 없다.
