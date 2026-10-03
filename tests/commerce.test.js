import test from "node:test";
import assert from "node:assert/strict";
import { addToBag, stockFor, totals } from "../src/commerce.js";
import { initialProducts, defaultSettings } from "../src/catalog.js";
test("bag keeps different colours and sizes separate and aggregates identical variants", () => {
  const p = initialProducts[0];
  let bag = addToBag([], p, "Ivory", "M");
  bag = addToBag(bag, p, "Onyx", "M");
  bag = addToBag(bag, p, "Ivory", "S");
  bag = addToBag(bag, p, "Ivory", "M");
  assert.equal(bag.length, 3);
  assert.equal(bag[0].quantity, 2);
});
test("bag cannot exceed per-variant stock or add unpublished products", () => {
  const p = structuredClone(initialProducts[0]);
  p.variants[0].sizes.M = 1;
  const bag = addToBag([], p, "Ivory", "M");
  assert.throws(() => addToBag(bag, p, "Ivory", "M"), /out of stock/);
  assert.equal(stockFor({ ...p, active: false }, "Ivory", "M"), 0);
  assert.throws(() => addToBag([], { ...p, active: false }, "Ivory", "M"));
});
test("totals use integer cents, apply the delivery threshold and avoid empty-bag delivery charges", () => {
  assert.deepEqual(totals([], initialProducts, defaultSettings), {
    subtotal: 0,
    shipping: 0,
    total: 0,
  });
  const bag = [{ productId: "essential-shirt", quantity: 1 }];
  assert.deepEqual(totals(bag, initialProducts, defaultSettings), {
    subtotal: 89000,
    shipping: 9500,
    total: 98500,
  });
  assert.equal(
    totals([{ ...bag[0], quantity: 3 }], initialProducts, defaultSettings)
      .shipping,
    0,
  );
});
