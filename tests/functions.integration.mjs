import { before, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { initialProducts, defaultSettings } from "../src/catalog.js";
const require = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
let functions, db;
const request = (data, admin = false) => ({
  data,
  auth: { uid: "integration-staff", token: { admin } },
  rawRequest: { ip: "127.0.0.1" },
});
before(async () => {
  assert(
    process.env.FIRESTORE_EMULATOR_HOST,
    "This test must run inside the Firebase emulator.",
  );
  process.env.GCLOUD_PROJECT = "demo-muanoluxe";
  functions = await import("../functions/index.js");
  db = require("firebase-admin/firestore").getFirestore();
});
test("backend rejects unprivileged product mutations", async () => {
  await assert.rejects(
    () => functions.saveProduct.run(request({ product: initialProducts[0] })),
    /Administrator access/,
  );
});
test("product revisions stop concurrent staff edits from overwriting inventory", async () => {
  const product = {
    ...structuredClone(initialProducts[0]),
    id: "integration-blazer",
    active: false,
  };
  await functions.saveProduct.run(request({ product }, true));
  let snap = await db.doc(`products/${product.id}`).get();
  assert.equal(snap.data().revision, 1);
  const outcomes = await Promise.allSettled([
    functions.saveProduct.run(
      request({ product: { ...product, revision: 1, name: "Edit A" } }, true),
    ),
    functions.saveProduct.run(
      request({ product: { ...product, revision: 1, name: "Edit B" } }, true),
    ),
  ]);
  assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
  snap = await db.doc(`products/${product.id}`).get();
  assert.equal(snap.data().revision, 2);
});
test("newsletter writes and notifications are idempotent and require consent", async () => {
  await assert.rejects(
    () =>
      functions.subscribe.run(
        request({ email: "integration@example.invalid", consent: false }),
      ),
    /Consent/,
  );
  const r = request({ email: "integration@example.invalid", consent: true });
  await functions.subscribe.run(r);
  await functions.subscribe.run(r);
  const subs = await db
    .collection("subscribers")
    .where("email", "==", "integration@example.invalid")
    .get();
  assert.equal(subs.size, 1);
  const events = await db
    .collection("notifications")
    .where("type", "==", "subscription")
    .get();
  assert.equal(events.size, 1);
  assert(!events.docs[0].data().body.includes("integration@example.invalid"));
});
test("inactive payments cannot reserve stock or be enabled by a store setting", async () => {
  await assert.rejects(
    () => functions.placeOrder.run(request({})),
    /not enabled/,
  );
  await assert.rejects(
    () =>
      functions.saveSettings.run(
        request(
          {
            settings: {
              ...defaultSettings,
              published: true,
              supportEmail: "muanoluxe@gmail.com",
            },
          },
          true,
        ),
      ),
    /inactive/,
  );
  assert.equal((await db.collection("orders").where("userId", "==", "integration-staff").get()).size, 0);
});
test("store settings save through administrator validation", async () => {
  await functions.saveSettings.run(
    request({ settings: { ...defaultSettings, published: false } }, true),
  );
  assert.equal((await db.doc("settings/store").get()).data().published, false);
});
