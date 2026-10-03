import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
} from "firebase/firestore";
import { readFile } from "node:fs/promises";
import { before, after, test } from "node:test";
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-muanoluxe",
    firestore: {
      rules: await readFile("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await Promise.all([
      setDoc(doc(db, "products/public"), { active: true }),
      setDoc(doc(db, "products/draft"), { active: false }),
      setDoc(doc(db, "orders/own"), { userId: "alice", total: 100 }),
      setDoc(doc(db, "orders/other"), { userId: "bob", total: 100 }),
      setDoc(doc(db, "subscribers/private"), { email: "private@example.com" }),
      setDoc(doc(db, "notifications/event"), { read: false }),
      setDoc(doc(db, "settings/store"), { published: true }),
    ]);
  });
});
after(async () => {
  await env?.cleanup();
});
test("public users see only published products and settings", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db, "products/public")));
  await assertFails(getDoc(doc(db, "products/draft")));
  await assertSucceeds(
    getDocs(query(collection(db, "products"), where("active", "==", true))),
  );
  await assertFails(getDocs(collection(db, "products")));
  await assertSucceeds(getDoc(doc(db, "settings/store")));
});
test("customers can read only their own orders and cannot forge totals", async () => {
  const db = env.authenticatedContext("alice").firestore();
  await assertSucceeds(getDoc(doc(db, "orders/own")));
  await assertFails(getDoc(doc(db, "orders/other")));
  await assertFails(
    setDoc(doc(db, "orders/forged"), { userId: "alice", total: 1 }),
  );
  await assertFails(getDoc(doc(db, "subscribers/private")));
  await assertFails(getDoc(doc(db, "notifications/event")));
});
test("admin reads all studio data but writes must go through server validation", async () => {
  const db = env.authenticatedContext("staff", { admin: true }).firestore();
  await assertSucceeds(getDoc(doc(db, "products/draft")));
  await assertSucceeds(getDoc(doc(db, "orders/other")));
  await assertSucceeds(getDoc(doc(db, "subscribers/private")));
  await assertSucceeds(getDoc(doc(db, "notifications/event")));
  await assertFails(setDoc(doc(db, "products/new"), { active: true }));
  await assertFails(setDoc(doc(db, "settings/store"), { published: false }));
});
