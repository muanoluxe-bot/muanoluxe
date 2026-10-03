import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
export const live = import.meta.env.VITE_FIREBASE_ENABLED === "true";
const app = initializeApp({
  apiKey: "AIzaSyCdOqcqrc95dM2XlrFHjMNckME9BUE3MBg",
  authDomain: "muanoluxe.firebaseapp.com",
  projectId: "muanoluxe",
  storageBucket: "muanoluxe.firebasestorage.app",
  messagingSenderId: "188217994921",
  appId: "1:188217994921:web:5b37a28b45874382d003b8",
});
export const auth = getAuth(app),
  db = getFirestore(app),
  storage = getStorage(app);
const functions = getFunctions(
  app,
  import.meta.env.VITE_FUNCTIONS_REGION || "europe-west1",
);
if (import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY)
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(
      import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY,
    ),
    isTokenAutoRefreshEnabled: true,
  });
if (import.meta.env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}
export async function call(name, data) {
  if (!live)
    throw new Error(
      "This is a preview. Live services will be available after Firebase is connected.",
    );
  return (await httpsCallable(functions, name)(data)).data;
}
