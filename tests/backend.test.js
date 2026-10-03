import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanProduct,
  cleanAddress,
  normalizeItems,
  reserve,
  validateTransition,
  validImage,
} from "../functions/domain.js";
import { initialProducts, defaultSettings } from "../src/catalog.js";
test("product validation rejects negative/fractional inventory, duplicate colours and unsafe image URLs", () => {
  assert.equal(cleanProduct(initialProducts[0]).name, "The Signature Blazer");
  for (const stock of [-1, 1.5, NaN]) {
    const p = structuredClone(initialProducts[0]);
    p.variants[0].sizes.M = stock;
    assert.throws(() => cleanProduct(p));
  }
  const p = structuredClone(initialProducts[0]);
  p.variants.push(p.variants[0]);
  assert.throws(() => cleanProduct(p), /unique/);
  assert.equal(validImage("javascript:alert(1)"), false);
  assert.equal(validImage("/images/products.png#blazer"), true);
});
test("duplicate cart lines are merged before reserving stock", () => {
  const i = {
    productId: "signature-blazer",
    color: "Ivory",
    size: "M",
    quantity: 7,
  };
  assert.equal(normalizeItems([i, i])[0].quantity, 14);
  const items = normalizeItems([i, i]);
  assert.throws(
    () =>
      reserve(
        items,
        new Map(initialProducts.map((p) => [p.id, p])),
        defaultSettings,
      ),
    /Not enough stock/,
  );
});
test("server pricing ignores client prices and reserves only the chosen colour and size", () => {
  const i = normalizeItems([
    {
      productId: "signature-blazer",
      color: "Ivory",
      size: "M",
      quantity: 2,
      price: 1,
    },
  ]);
  const original = structuredClone(initialProducts);
  const r = reserve(
    i,
    new Map(original.map((p) => [p.id, p])),
    defaultSettings,
  );
  assert.equal(r.total, 378000);
  assert.equal(r.updated.get("signature-blazer").variants[0].sizes.M, 10);
  assert.equal(r.updated.get("signature-blazer").variants[1].sizes.M, 12);
  assert.equal(original[0].variants[0].sizes.M, 12);
});
test("unavailable colours, sizes and products cannot be purchased", () => {
  for (const overrides of [
    { color: "Purple" },
    { size: "XXXL" },
    { productId: "missing" },
  ]) {
    assert.throws(() =>
      reserve(
        normalizeItems([
          {
            productId: "signature-blazer",
            color: "Ivory",
            size: "M",
            quantity: 1,
            ...overrides,
          },
        ]),
        new Map(initialProducts.map((p) => [p.id, p])),
        defaultSettings,
      ),
    );
  }
});
test("invalid quantities, oversized bags, unsafe identifiers and malformed addresses fail validation", () => {
  for (const n of [0, -1, 1.5, 21])
    assert.throws(() =>
      normalizeItems([
        { productId: "p", color: "Ivory", size: "M", quantity: n },
      ]),
    );
  assert.throws(() => normalizeItems([]));
  assert.throws(() =>
    normalizeItems([
      { productId: "../orders", color: "Ivory", size: "M", quantity: 1 },
    ]),
  );
  assert.throws(() => cleanAddress({ name: "a" }));
});
test("only allowed fulfilment transitions can be performed by administrators", () => {
  assert.equal(validateTransition("paid", "processing"), true);
  assert.equal(validateTransition("pending_payment", "paid"), false);
  assert.equal(validateTransition("delivered", "cancelled"), false);
  assert.equal(validateTransition("paid_stock_review", "shipped"), false);
  assert.equal(validateTransition("pending_payment", "cancelled"), true);
});
