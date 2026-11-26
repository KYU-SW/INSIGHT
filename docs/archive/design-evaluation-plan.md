# 디자인 평가 대비 수정안

> **Historical planning note (archived).** 초기 UI 개편 시점(커밋 ce9d62b·2f9292d)의 계획·변경 기록이며 현재 코드·테스트 수와 일치하지 않을 수 있다. 현재 상태는 루트 `README.md`와 `AGENTS.md`를 기준으로 한다.

가정: 평가 기준은 (1) 시각 위계 (2) 사용성 (3) 접근성 (4) 일관성 (5) 임상 문구 적절성이다. 별도 루브릭이 있으면 항목을 재배치한다.

제약: 기존 구현은 수정만 하고 삭제하지 않는다. 핸들러, 서비스 호출, 데이터 타입, 마이크/하드웨어 기능은 변경하지 않는다. 추가 UI는 기존 `results` 상태에서 파생한 값만 쓴다.

| # | 기준 | 현재 문제 | 수정 | 파일 |
|---|------|-----------|------|------|
| 1 | 위계 | 분석 상태가 일반 텍스트라 색/아이콘 단서 없음 | 상태 칩(아이콘 + 텍스트 + 톤). 색만으로 구분하지 않음. 판정이 아니라 "분석 상태" 표기 유지 | live-analysis.tsx, globals.css |
| 2 | 사용성 | 레지스트리 진입 시 규모 파악 불가 | 요약 스트립(Subjects / Recordings / Latest) 추가 | session-registry.tsx |
| 3 | 사용성 | Subject ID 25개 이상 시 탐색 불가 | 목록 상단 로컬 검색 입력 추가 (결과 없을 때 안내) | session-registry.tsx |
| 4 | 사용성 | 분석 전 화면이 폼 하나뿐, 다음 단계 불명 | 결과 대기 안내 패널(1 입력 → 2 분석 → 3 결과) 추가. 녹음 기능 없음 명시 | live-analysis.tsx |
| 5 | 접근성 | 표에 caption/scope 없음, lang="en"이나 본문은 한/영 혼용 | `caption.sr-only`, `scope="col"`, `lang="ko"` | session-registry.tsx, layout.tsx |
| 6 | 접근성 | 모바일 터치 타겟 30px, 비활성 버튼 대비 낮음 | 모바일 44px, 비활성 시 대비 확보, reduced-motion 대응 | globals.css |
| 7 | 일관성 | 전역 `.workspace` 오버라이드 의존 | 디자인 토큰(CSS 변수) 도입 후 신규 규칙은 토큰만 사용 | globals.css |
| 8 | 임상 문구 | 점수 해석 오해 가능 | 점수 막대에 임계선 없음 유지, "screening support" 문구는 요약 스트립 툴팁이 아닌 aria-label에만 반영 | live-analysis.tsx |

검증: lint, typecheck, test, build 후 dev 서버에서 데스크톱/모바일 확인.
