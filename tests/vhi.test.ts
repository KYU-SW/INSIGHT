import assert from "node:assert/strict";
import { test } from "node:test";
import { VHI_ITEMS } from "../src/data/vhi";
import { isCompleteVhi, scoreVhi } from "../src/lib/vhi";

test("VHI-30 keeps PhenX item order and F/P/E domain mapping", () => {
  assert.deepEqual(VHI_ITEMS.map(item => item.number), Array.from({ length: 30 }, (_, i) => i + 1));
  const numbers = (domain: string) => VHI_ITEMS.filter(item => item.domain === domain).map(item => item.number);
  assert.deepEqual(numbers("functional"), [1, 3, 5, 6, 8, 11, 12, 16, 19, 22]);
  assert.deepEqual(numbers("physical"), [2, 4, 10, 13, 14, 17, 18, 20, 21, 26]);
  assert.deepEqual(numbers("emotional"), [7, 9, 15, 23, 24, 25, 27, 28, 29, 30]);
});

test("domain scores sum to the total and respect the 0-120 range", () => {
  assert.deepEqual(scoreVhi(Array(30).fill(0)), { functional: 0, physical: 0, emotional: 0, total: 0 });
  assert.deepEqual(scoreVhi(Array(30).fill(4)), { functional: 40, physical: 40, emotional: 40, total: 120 });
  const answers = VHI_ITEMS.map(item => (item.domain === "functional" ? 1 : item.domain === "physical" ? 2 : 3));
  assert.deepEqual(scoreVhi(answers), { functional: 10, physical: 20, emotional: 30, total: 60 });
});

test("incomplete or out-of-range answers are rejected instead of partially scored", () => {
  assert.throws(() => scoreVhi(Array(29).fill(1)), /30개/);
  assert.throws(() => scoreVhi([...Array(29).fill(1), 5]), /문항 30/);
  assert.throws(() => scoreVhi([...Array(29).fill(1), 1.5]), /문항 30/);
  assert.equal(isCompleteVhi([...Array(29).fill(1), undefined]), false);
  assert.equal(isCompleteVhi(Array(30).fill(2)), true);
});
