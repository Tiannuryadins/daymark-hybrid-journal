/**
 * Firebase project configuration.
 *
 * HOW TO FILL THIS IN (free, no billing — see SETUP.md):
 * 1. Create a Firebase project on the no-cost Spark plan.
 * 2. In the console, go to AI Services > AI Logic > Get started, choose the
 *    "Gemini Developer API" provider (free tier, no billing account needed).
 * 3. Register a Web app and paste its config object below.
 * 4. Optionally add a reCAPTCHA v3 site key for App Check on the hosted site.
 *    On localhost the app uses the App Check debug provider instead.
 *
 * NOTE: these web config values are public client identifiers, not secrets.
 * The Gemini API is protected by Firebase App Check, and Firestore is
 * protected by security rules (see firestore.rules). Never commit a service
 * account key or any server credential here.
 */

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

/**
 * reCAPTCHA v3 site key used by App Check on the hosted (non-localhost) site.
 * Leave as "" to use the App Check debug provider everywhere instead — the
 * #BuildHybridAI rules explicitly accept debug tokens in submissions, but the
 * debug token must be registered in the Firebase console (see SETUP.md).
 */
export const recaptchaSiteKey = "";

/** True once a real Firebase config has been pasted in. */
export const isConfigured =
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.projectId !== "YOUR_PROJECT_ID" &&
  firebaseConfig.appId !== "YOUR_APP_ID";
