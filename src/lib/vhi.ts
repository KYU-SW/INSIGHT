import { VHI_ITEMS, type VhiDomain } from "@/data/vhi";

/** answers[i] is the 0-4 response to item i + 1. */
export type VhiAnswers = readonly number[];
export type VhiScores = { functional: number; physical: number; emotional: number; total: number };

export function isCompleteVhi(answers: readonly (number | undefined)[]): answers is VhiAnswers {
  return answers.length === VHI_ITEMS.length && answers.every(value => Number.isInteger(value) && value! >= 0 && value! <= 4);
}

/** Validates all 30 answers and sums each domain. Used by the UI and recomputed on the server before storage. */
export function scoreVhi(answers: readonly unknown[]): VhiScores {
  if (!Array.isArray(answers) || answers.length !== VHI_ITEMS.length) throw new Error("VHI-30 응답 30개가 모두 필요합니다.");
  const sums: Record<VhiDomain, number> = { functional: 0, physical: 0, emotional: 0 };
  VHI_ITEMS.forEach((item, index) => {
    const value = answers[index];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 4) throw new Error(`VHI 문항 ${item.number}의 응답은 0~4 정수여야 합니다.`);
    sums[item.domain] += value;
  });
  return { ...sums, total: sums.functional + sums.physical + sums.emotional };
}
