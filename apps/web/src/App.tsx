import React, { useEffect } from "react";
import Router from "@/Components/router";
import "./App.css";
import { UserContextProvider } from "./Contexts/userContext";
import { SelectedProvider } from "./Hooks/Selected/useSelected";
import { appleAuthHelpers, useScript } from "react-apple-signin-auth";
import Cookies from "js-cookie";

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC as string;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId &&
  VAPID_PUBLIC,
);

// 서비스 워커 등록 함수
const registerServiceWorker = async () => {
  const scriptURL = "firebase-messaging-sw.js";
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(scriptURL);
      if (registration.installing) {
        console.log("Service worker installing");
      } else if (registration.waiting) {
        console.log("Service worker installed");
      } else if (registration.active) {
        console.log("Service worker active");
      }
    } catch (error) {
      console.error(`Service worker registration failed: ${error}`);
    }
  }
};

function App() {
  useScript(appleAuthHelpers.APPLE_SCRIPT_SRC);

  useEffect(() => {
    if (!firebaseConfigured || !("Notification" in window) || !("serviceWorker" in navigator))
      return;
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void import("firebase/messaging")
      .then(async ({ getMessaging, getToken, isSupported, onMessage }) => {
        const supported = await isSupported();
        if (!supported || !active) return;
        try {
          const { initializeApp } = await import("firebase/app");
          const messaging = getMessaging(initializeApp(firebaseConfig));
          await registerServiceWorker();
          const permission = await Notification.requestPermission();
          if (permission !== "granted" || !active) return;
          const currentToken = await getToken(messaging, { vapidKey: VAPID_PUBLIC });
          if (currentToken) Cookies.set("fcmToken", currentToken);
          unsubscribe = onMessage(messaging, (payload) =>
            console.info("Push message received", payload),
          );
        } catch (error) {
          console.error("Push notifications are unavailable:", error);
        }
      })
      .catch((error) => console.error("Push notification capability check failed:", error));

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return (
    <SelectedProvider>
      <UserContextProvider>
        <Router />
      </UserContextProvider>
    </SelectedProvider>
  );
}

export default App;
