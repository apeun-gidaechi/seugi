const firebaseEnvironmentKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_MEASUREMENT_ID",
] as const;

export type FirebaseServiceWorkerEnvironment = Partial<Record<
  (typeof firebaseEnvironmentKeys)[number],
  string | undefined
>>;

export function renderFirebaseServiceWorkerEnvironment(
  environment: FirebaseServiceWorkerEnvironment,
) {
  const config = Object.fromEntries(
    firebaseEnvironmentKeys.map((key) => [key, environment[key] ?? ""]),
  );
  return `const swEnv = ${JSON.stringify(config)};\n`;
}
