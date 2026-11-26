// VHI-30 items ported from VoiceCare VHI.md (PhenX English source, Korean development translation).
// Item numbers and F/P/E domains follow the PhenX worksheet scoring instructions and must not be changed.
// Not the validated K-VHI: wording and reuse permission must be confirmed before clinical use.

export type VhiDomain = "functional" | "physical" | "emotional";

export const VHI_INSTRUMENT = {
  name: "Voice Handicap Index-30 (VHI-30)",
  version: "PhenX-English-source-Korean-translation",
  source: "PhenX Toolkit PX201301 · Jacobson et al., Am J Speech Lang Pathol 1997;6(3):66-70",
  usage_status: "development_translation",
} as const;

export const VHI_SCALE = [
  { value: 0, label: "전혀 없음", english: "Never" },
  { value: 1, label: "거의 없음", english: "Almost Never" },
  { value: 2, label: "가끔", english: "Sometimes" },
  { value: 3, label: "거의 항상", english: "Almost Always" },
  { value: 4, label: "항상", english: "Always" },
] as const;

export const VHI_DOMAIN_LABELS: Record<VhiDomain, { ko: string; en: string }> = {
  functional: { ko: "기능적 영역", en: "Functional" },
  physical: { ko: "신체적 영역", en: "Physical" },
  emotional: { ko: "정서적 영역", en: "Emotional" },
};

const F = "functional", P = "physical", E = "emotional";

export const VHI_ITEMS: readonly { number: number; domain: VhiDomain; text: string }[] = [
  { number: 1, domain: F, text: "내 목소리 때문에 다른 사람들이 내 말을 듣기 어렵다." },
  { number: 2, domain: P, text: "말을 할 때 숨이 부족해진다." },
  { number: 3, domain: F, text: "시끄러운 장소에서는 사람들이 내 말을 이해하기 어려워한다." },
  { number: 4, domain: P, text: "하루 중에도 내 목소리의 상태가 달라진다." },
  { number: 5, domain: F, text: "집 안에서 가족을 부를 때 가족들이 내 목소리를 잘 듣지 못한다." },
  { number: 6, domain: F, text: "목소리 문제 때문에 원하는 만큼 전화 통화를 하지 못한다." },
  { number: 7, domain: E, text: "내 목소리 때문에 다른 사람과 이야기할 때 긴장된다." },
  { number: 8, domain: F, text: "내 목소리 때문에 여러 사람이 모인 자리를 피하는 편이다." },
  { number: 9, domain: E, text: "다른 사람들이 내 목소리를 듣고 짜증을 내는 것 같다." },
  { number: 10, domain: P, text: "사람들이 내 목소리에 무슨 문제가 있느냐고 묻는다." },
  { number: 11, domain: F, text: "내 목소리 때문에 친구, 이웃 또는 친척들과 대화하는 횟수가 줄었다." },
  { number: 12, domain: F, text: "사람들이 나와 직접 대화할 때 말을 다시 해 달라고 요청한다." },
  { number: 13, domain: P, text: "내 목소리가 갈라지고 건조하게 들린다." },
  { number: 14, domain: P, text: "목소리를 내기 위해 힘을 주어야 한다고 느낀다." },
  { number: 15, domain: E, text: "다른 사람들이 내 목소리 문제를 이해하지 못한다고 느낀다." },
  { number: 16, domain: F, text: "목소리 문제 때문에 개인생활과 사회생활에 제약을 받는다." },
  { number: 17, domain: P, text: "내 목소리가 얼마나 또렷하게 나올지 예측하기 어렵다." },
  { number: 18, domain: P, text: "평소와 다르게 들리도록 내 목소리를 바꾸려고 노력한다." },
  { number: 19, domain: F, text: "내 목소리 때문에 대화에서 소외된다고 느낀다." },
  { number: 20, domain: P, text: "말을 하기 위해 많은 노력을 기울여야 한다." },
  { number: 21, domain: P, text: "저녁이 되면 내 목소리 상태가 더 나빠진다." },
  { number: 22, domain: F, text: "목소리 문제로 인해 수입이 줄어든다." },
  { number: 23, domain: E, text: "내 목소리 문제 때문에 속상하다." },
  { number: 24, domain: E, text: "목소리 문제 때문에 이전보다 외향적으로 행동하지 않게 되었다." },
  { number: 25, domain: E, text: "내 목소리 때문에 장애가 있는 것처럼 느껴진다." },
  { number: 26, domain: P, text: "말을 하는 도중에 목소리가 갑자기 나오지 않을 때가 있다." },
  { number: 27, domain: E, text: "사람들이 말을 반복해 달라고 요청하면 짜증이 난다." },
  { number: 28, domain: E, text: "사람들이 말을 반복해 달라고 요청하면 창피하다." },
  { number: 29, domain: E, text: "내 목소리 때문에 내가 무능력한 사람처럼 느껴진다." },
  { number: 30, domain: E, text: "나는 내 목소리 문제를 부끄럽게 생각한다." },
];
