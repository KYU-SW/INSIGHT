import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidSubjectId, normalizeSubjectId, requireSubjectId } from "../src/lib/subject-id";

test("subject IDs are normalized to one canonical form", () => {
  assert.equal(requireSubjectId("  subj_001 "), "SUBJ_001");
  assert.equal(normalizeSubjectId("als-7"), "ALS-7");
});

test("subject IDs reject characters outside the shared format", () => {
  for (const bad of ["", "SUBJ 001", "SUBJ/001", "환자1", "A".repeat(81)]) assert.equal(isValidSubjectId(normalizeSubjectId(bad)), false, bad);
  assert.throws(() => requireSubjectId("SUBJ.001"), /Subject ID/);
});
