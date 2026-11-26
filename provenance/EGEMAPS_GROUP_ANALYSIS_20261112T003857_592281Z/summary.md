# eGeMAPS ALS vs HC 요약 (20261112T003857_592281Z)
- 환자 HC 106 / ALS 165, 녹음 2164, split=전체
- ALL scope에서 FDR q<0.05 유의 특징: 27/88
- 특징 묶음별 유의 개수: Spectral 13, Frequency 7, Temporal 4, Energy/Amplitude 3

## |Cliff's delta| 상위 10 (ALL)
- **F0semitone_pctlrange0-2** (Frequency): ALS↑, delta=+0.45 (medium), AUC=0.72, q=4.8e-08
- **F0semitone_CV** (Frequency): ALS↑, delta=+0.39 (medium), AUC=0.70, q=1.9e-06
- **F3amplitudeLogRelF0_CV** (Spectral): ALS↑, delta=+0.32 (small), AUC=0.66, q=2.9e-04
- **F3amplitudeLogRelF0_mean** (Spectral): ALS↓, delta=-0.31 (small), AUC=0.35, q=4.5e-04
- **F1amplitudeLogRelF0_mean** (Spectral): ALS↓, delta=-0.30 (small), AUC=0.35, q=4.6e-04
- **F0semitone_meanFallingSlope** (Frequency): ALS↑, delta=+0.30 (small), AUC=0.65, q=4.6e-04
- **F2amplitudeLogRelF0_mean** (Spectral): ALS↓, delta=-0.30 (small), AUC=0.35, q=5.1e-04
- **spectralFluxV_mean** (Spectral): ALS↑, delta=+0.29 (small), AUC=0.65, q=5.1e-04
- **F2amplitudeLogRelF0_CV** (Spectral): ALS↑, delta=+0.28 (small), AUC=0.64, q=7.5e-04
- **hammarbergIndexUV_mean** (Spectral): ALS↑, delta=+0.28 (small), AUC=0.64, q=7.5e-04

## 과제별 유의 특징 수
- rhythmKA: 34
- phonationE: 29
- phonationA: 28
- phonationI: 24
- rhythmTA: 19
- phonationO: 18
- rhythmPA: 18
- phonationU: 14

## 공변량(sex, age) 보정 후 유의 특징: 32/88