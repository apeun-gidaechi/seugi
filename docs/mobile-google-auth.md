# Mobile Google sign-in and Classroom

The Expo app uses the same server authorization-code flow as the original Android and iOS apps. It asks Google Sign-In for a server auth code with the Classroom read-only scopes, then exchanges that code through the TypeScript API. Google client secrets remain server-side.

On iOS, the login screen also offers the original Sign in with Apple flow through Apple's native authorization sheet. The app sends Apple's authorization code and the first-time full name (when provided) to `/oauth/apple/authenticate`. Configure `APPLE_MOBILE_CLIENT_ID` as the app's bundle identifier and provide a valid Apple `APPLE_CLIENT_SECRET` in the API environment. Apple Sign-In is not available on Android.

## Google Cloud configuration

Create an OAuth client of type **Web application** for the backend and use its client ID as both `GOOGLE_CLIENT_ID` in the API environment and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` for the app. Keep `GOOGLE_CLIENT_SECRET` only in the API environment. Add separate native Android and iOS OAuth clients for package `com.seugi.app` and bundle ID `com.seugi.app`. For Android, register the SHA-1 fingerprints for each debug/release signing key. For iOS, provide the native client ID and its reversed-client-ID URL scheme as `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`.

Enable these scopes on the consent screen:

- `https://www.googleapis.com/auth/classroom.courses.readonly`
- `https://www.googleapis.com/auth/classroom.coursework.me.readonly`
- `https://www.googleapis.com/auth/classroom.coursework.students.readonly`

The API needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Web OAuth additionally needs `GOOGLE_WEB_REDIRECT_URI`. The native Google Sign-In SDK exchanges server auth codes with an empty redirect URI, so `GOOGLE_MOBILE_REDIRECT_URI` is not used.

## Build and run

Copy this file to `apps/mobile/.env` and fill in the public client IDs. Do not commit `.env` files or put `GOOGLE_CLIENT_SECRET` in an `EXPO_PUBLIC_` variable. Then build a native development app with `pnpm --filter @seugi/mobile android` or `pnpm --filter @seugi/mobile ios`; start Metro with `pnpm --filter @seugi/mobile start`. The Google Sign-In module uses native code and does not run inside Expo Go. Rebuild the native app whenever the app config or native OAuth identifiers change.
