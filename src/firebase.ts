/**
 * Firebase initialization: App, App Check, anonymous Auth, Firestore and
 * Firebase AI Logic (Gemini Developer API backend — free tier, Spark plan).
 *
 * No billing is used anywhere: AI Logic itself is free-of-charge and the
 * Gemini Developer API free tier works on the no-cost Spark plan without a
 * Cloud Billing account. Cloud Functions / Cloud Storage are NOT used
 * (they require Blaze since 2026).
 */
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  CustomProvider,
} from "firebase/app-check";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getAI, type AI } from "firebase/ai";
import { GoogleAIBackend } from "firebase/ai";
import { firebaseConfig, recaptchaSiteKey, isConfigured } from "./config";

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  ai: AI;
}

let services: FirebaseServices | null = null;

function isLocalhost(): boolean {
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

/**
 * Initialize all Firebase services. Throws if the config is still a
 * placeholder — callers must check isConfigured first and show the setup
 * banner instead of calling this.
 */
export function initFirebase(): FirebaseServices {
  if (services) return services;
  if (!isConfigured) {
    throw new Error(
      "Firebase is not configured yet. Paste your project config into src/config.ts (see SETUP.md).",
    );
  }

  const app = initializeApp(firebaseConfig);

  // App Check is required by Firebase AI Logic. Localhost uses the debug
  // provider (debug tokens are explicitly accepted in #BuildHybridAI
  // submissions); the hosted site uses reCAPTCHA v3 when a site key is set,
  // otherwise the debug provider with a console-registered token.
  if (isLocalhost() || !recaptchaSiteKey) {
    // The debug provider prints a debug token to the console on first run;
    // register it under Security > App Check > Apps > Manage debug tokens.
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    // In debug mode the SDK exchanges the debug token directly and never
    // calls the provider, so a CustomProvider placeholder satisfies the type.
    initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: () =>
          Promise.reject(
            new Error(
              "App Check is in debug mode — the provider should never be called.",
            ),
          ),
      }),
    });
    if (!isLocalhost()) {
      console.warn(
        "[Daymark] No reCAPTCHA v3 site key configured — using the App Check debug provider. " +
          "Register the debug token printed in the console, or set recaptchaSiteKey in src/config.ts.",
      );
    }
  } else {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }

  const auth = getAuth(app);

  // Firestore with persistent local cache: entries stay available offline,
  // which is what makes the on-device reflection path genuinely offline-able.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });

  // Gemini Developer API backend = free tier on the Spark plan.
  const ai = getAI(app, { backend: new GoogleAIBackend() });

  services = { app, auth, db, ai };
  return services;
}

/** Sign in anonymously (no account, no personal data) and resolve the user. */
export function ensureAnonymousUser(auth: Auth): Promise<User> {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsub();
          resolve(user);
        }
      },
      (err) => {
        unsub();
        reject(err);
      },
    );
    signInAnonymously(auth).catch((err: unknown) => {
      unsub();
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}
