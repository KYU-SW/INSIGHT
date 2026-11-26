# ALS Transformer 모델 실험 번들

이 번들은 Transformer 후보를 한 노트북에 모으지 않고, 모델 구성별로 독립된 노트북으로 관리한다. 각 노트북은 자신의 학습·평가·산출물 저장 절차를 포함하며, 계산량이 큰 frozen 음성 임베딩만 Google Drive의 공용 캐시를 재사용할 수 있다.

## 현재 구현

| ID | 노트북 | 구성 | 상태 |
|---|---|---|---|
| T1 | `01_T1_Frozen_WavLM_ElasticNet.ipynb` | Frozen WavLM Base Plus + Elastic Net | 작성 완료 |

## 후속 후보

| ID | 예정 노트북 | 구성 | 진행 조건 |
|---|---|---|---|
| T2 | `02_T2_Frozen_HuBERT_ElasticNet.ipynb` | Frozen HuBERT + Elastic Net | T1 백본 민감도 비교 필요 시 |
| T3 | `03_T3_Frozen_WavLM_SmallMLP.ipynb` | Frozen WavLM + 작은 MLP | T1 임베딩이 유망할 때 |
| T4 | `04_T4_WavLM_TaskAttention.ipynb` | 과제별 WavLM 임베딩 + 얕은 attention | 과제 평균의 한계가 확인될 때 |
| T5 | `05_T5_M1_Transformer_Fusion.ipynb` | 기존 M1 + 최상위 Transformer 확률 융합 | 독립 Transformer 후보가 M1과 상보적일 때 |

빈 후보 노트북은 만들지 않았다. 후보를 진행할 때 각각 별도 파일로 추가한다.

## T1 실행 방법

1. `01_T1_Frozen_WavLM_ElasticNet.ipynb`를 Google Colab에서 연다.
2. GPU 런타임을 선택한다.
3. 셀을 위에서부터 실행한다.
4. 최초 실행에서는 WavLM 모델 다운로드와 2,176개 녹음의 임베딩 추출이 수행된다.
5. 임베딩은 `TRANSFORMER_SHARED_CACHE`에 저장되므로 중단 후 재실행할 수 있다.
6. 최종 결과는 `ML_EXPERIMENT_T1_WAVLM_FROZEN_ELASTICNET`에 저장된다.

## T1의 검증 원칙

- 동일 환자의 모든 과제와 chunk는 같은 fold에 둔다.
- WavLM은 완전히 고정하고 라벨을 사용해 업데이트하지 않는다.
- 스케일러와 Elastic Net은 각 training fold에서만 적합한다.
- Platt 보정과 임계값 선택에는 training OOF만 사용한다.
- 공식 validation은 선택 절차가 끝난 뒤 평가한다.
- 전체 ALS 대 HC와 Class 4 ALS 대 Class 5 HC를 함께 보고한다.
- 2차 실험 산출물이 있으면 M1과 paired bootstrap으로 직접 비교한다.

## 공용 캐시 정책

공용 캐시에는 라벨과 무관한 frozen WavLM 녹음 임베딩만 저장한다. 분류기, 확률 보정기, 임계값, validation 결과는 T1 전용 출력 폴더에 저장한다. 이후 후보가 같은 백본·레이어·pooling을 사용할 때만 기존 임베딩 캐시를 재사용한다.
