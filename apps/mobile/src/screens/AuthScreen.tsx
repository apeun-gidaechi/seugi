import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Animated, BackHandler, Platform, SafeAreaView, Text, useWindowDimensions } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { AuthStartScreen } from "./auth/AuthStartScreen";
import { EmailLoginScreen } from "./auth/EmailLoginScreen";
import { EmailSignupScreen, type SignupValidation } from "./auth/EmailSignupScreen";
import { EmailVerificationScreen } from "./auth/EmailVerificationScreen";
import { authStyles as styles } from "./authStyles";
import { emailRegistrationAutoSignIn, emailVerificationFeedback, emailVerificationTimerStartsOnAttempt, type EmailVerificationEvent } from "../utils/authFeedback";

type AuthScreenProps = {
  hydrated: boolean;
  appleAvailable: boolean;
  loading: boolean;
  error: string;
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  code: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onGoogleCode: (code: string) => Promise<void>;
  onAppleSignIn: () => Promise<void>;
  onError: (message: string) => void;
  onSendVerification: () => Promise<boolean>;
  onLogin: () => void;
  onRegister: () => Promise<boolean>;
};

type AuthRoute = "start" | "login" | "signup" | "verification";

export function AuthScreen({ hydrated, appleAvailable, loading, error, email, password, confirmPassword, name, code, onEmailChange, onPasswordChange, onConfirmPasswordChange, onNameChange, onCodeChange, onGoogleCode, onAppleSignIn, onError, onSendVerification, onLogin, onRegister }: AuthScreenProps) {
  const { width } = useWindowDimensions();
  const [routeStack, setRouteStack] = useState<AuthRoute[]>(["start"]);
  const screen = routeStack[routeStack.length - 1];
  const progress = useRef(new Animated.Value(1)).current;
  const direction = useRef(1);
  const previousScreen = useRef<AuthRoute | undefined>(undefined);
  const navigate = (route: AuthRoute) => { direction.current = 1; setRouteStack((current) => [...current, route]); };
  const goBack = useCallback(() => { direction.current = -1; setRouteStack((current) => current.length > 1 ? current.slice(0, -1) : current); }, []);
  const [showSignInOptions, setShowSignInOptions] = useState(false);
  const [signupError, setSignupError] = useState<SignupValidation>();
  const [verificationWaiting, setVerificationWaiting] = useState(false);
  const [verificationSeconds, setVerificationSeconds] = useState(300);
  const [verificationAction, setVerificationAction] = useState<"send" | "register">("send");
  useEffect(() => {
    if (previousScreen.current === undefined) { previousScreen.current = screen; return; }
    if (previousScreen.current === screen) return;
    previousScreen.current = screen;
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: Platform.OS === "android" ? 400 : 320, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [progress, screen]);
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [direction.current < 0 ? -width / 3 : width, 0] });
  const transition = (content: ReactNode) => <Animated.View style={[{ flex: 1, opacity: progress, transform: [{ translateX: Platform.OS === "ios" ? translateX : 0 }] }]}>{content}</Animated.View>;
  const leaveVerification = useCallback(() => {
    onCodeChange("");
    onError("");
    goBack();
  }, [goBack, onCodeChange, onError]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (showSignInOptions) { setShowSignInOptions(false); return true; }
      if (screen === "start") return false;
      if (screen === "verification") leaveVerification();
      else goBack();
      return true;
    });
    return () => subscription.remove();
  }, [screen, showSignInOptions, leaveVerification, goBack]);
  useEffect(() => {
    if (!verificationWaiting) return;
    const timer = setInterval(() => setVerificationSeconds((remaining) => {
      if (remaining <= 1) { setVerificationWaiting(false); return 300; }
      return remaining - 1;
    }), 1_000);
    return () => clearInterval(timer);
  }, [verificationWaiting]);
  useEffect(() => {
    if (screen !== "verification" || !error) return;
    const event: EmailVerificationEvent = verificationAction === "send" ? "send-failed" : "register-failed";
    const feedback = emailVerificationFeedback(Platform.OS, event, /인증.*코드|code/i.test(error));
    Alert.alert(feedback.title, feedback.message);
  }, [error, screen, verificationAction]);
  if (!hydrated) return <SafeAreaView style={styles.auth}><ActivityIndicator size="large" color={SeugiColor.Primary500} /><Text style={styles.subtitle}>로그인 정보를 확인하는 중…</Text></SafeAreaView>;
  if (screen === "signup") return transition(<EmailSignupScreen name={name} email={email} password={password} confirmPassword={confirmPassword} error={error} loading={loading} validation={signupError} onNameChange={onNameChange} onEmailChange={onEmailChange} onPasswordChange={onPasswordChange} onConfirmPasswordChange={onConfirmPasswordChange} onValidationChange={setSignupError} onBack={goBack} onLogin={() => navigate("login")} onContinue={() => { onError(""); navigate("verification"); }} />);
  if (screen === "verification") return transition(<EmailVerificationScreen code={code} error={error} loading={loading} password={password} name={name} waiting={verificationWaiting} seconds={verificationSeconds} onCodeChange={onCodeChange} onBack={leaveVerification} onSend={async () => { setVerificationAction("send"); const startsOnAttempt = emailVerificationTimerStartsOnAttempt(Platform.OS); if (startsOnAttempt) { setVerificationSeconds(300); setVerificationWaiting(true); } if (await onSendVerification()) { if (!startsOnAttempt) { setVerificationSeconds(300); setVerificationWaiting(true); } if (Platform.OS === "android") { const feedback = emailVerificationFeedback("android", "code-sent"); Alert.alert(feedback.title, feedback.message); } } }} onRegister={async () => { setVerificationAction("register"); const succeeded = await onRegister(); if (succeeded && !emailRegistrationAutoSignIn(Platform.OS)) { direction.current = -1; onCodeChange(""); setRouteStack(["start"]); } }} />);
  if (screen === "login") return transition(<EmailLoginScreen email={email} password={password} error={error} loading={loading} onEmailChange={onEmailChange} onPasswordChange={onPasswordChange} onBack={goBack} onSignup={() => navigate("signup")} onLogin={onLogin} />);
  return transition(<AuthStartScreen error={error} appleAvailable={appleAvailable} loading={loading} showOptions={showSignInOptions} onShowOptions={() => setShowSignInOptions(true)} onDismissOptions={() => setShowSignInOptions(false)} onLogin={() => { setShowSignInOptions(false); navigate("login"); }} onGoogleCode={onGoogleCode} onAppleSignIn={onAppleSignIn} onError={onError} />);
}
