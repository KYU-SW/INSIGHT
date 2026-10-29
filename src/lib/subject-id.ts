// Single source of truth for Subject ID format (UI input, analysis, Firebase upload/load).
// Keep SUBJECT_ID_PATTERN in sync with src/backend/app.py.
export const SUBJECT_ID_PATTERN = /^[A-Z0-9_-]{1,80}$/;
export const SUBJECT_ID_HINT = "영문 대문자·숫자·밑줄(_)·하이픈(-), 1–80자 (예: SUBJ_001)";

export function normalizeSubjectId(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidSubjectId(value: string): boolean {
  return SUBJECT_ID_PATTERN.test(value);
}

export function requireSubjectId(value: string): string {
  const normalized = normalizeSubjectId(value);
  if (!isValidSubjectId(normalized)) throw new Error(`Subject ID 형식이 올바르지 않습니다. ${SUBJECT_ID_HINT}`);
  return normalized;
}
