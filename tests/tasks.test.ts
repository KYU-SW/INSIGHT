import assert from "node:assert/strict";
import { test } from "node:test";
import { VOICE_TASKS } from "../src/data/tasks";

test("all supported recording tasks have unique codes and usable labels", () => {
  assert.deepEqual(VOICE_TASKS.map(task => task.code), [
    "vowel_a", "vowel_e", "vowel_i", "vowel_o", "vowel_u", "syllable_pa", "syllable_ta", "syllable_ka",
  ]);
  assert.equal(new Set(VOICE_TASKS.map(task => task.code)).size, VOICE_TASKS.length);
  assert.ok(VOICE_TASKS.every(task => task.label.length > 0));
});
