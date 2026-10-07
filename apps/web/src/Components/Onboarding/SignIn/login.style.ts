import styled from "styled-components";
import { designTokens as t } from "@/Design/tokens";

export const LoginMain = styled.main`
  min-height: 100svh;
  display: grid;
  place-items: center;
  padding: 40px 24px;
  background:
    radial-gradient(ellipse at 12% 10%, rgba(91, 164, 255, 0.13), transparent 32%),
    ${t.color.canvas};
  color: ${t.color.ink};
  font-family: ${t.type.family};
`;

export const LoginFrame = styled.div`
  width: min(100%, 1120px);
  min-height: 650px;
  display: grid;
  grid-template-columns: 1fr 0.88fr;
  overflow: hidden;
  border: 1px solid rgba(218, 228, 240, 0.9);
  border-radius: 28px;
  background: ${t.color.surface};
  box-shadow: ${t.shadow.card};

  @media (max-width: ${t.breakpoint.mobile}) {
    width: min(100%, 520px);
    min-height: 0;
    grid-template-columns: 1fr;
    border-radius: 22px;
  }
`;

export const WelcomePanel = styled.section`
  position: relative;
  display: flex;
  min-height: 650px;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  padding: 42px;
  color: #fff;
  background: linear-gradient(145deg, #1769d2 0%, #2588e9 55%, #31b7c4 100%);

  &::before, &::after { content: ""; position: absolute; border: 1px solid rgba(255,255,255,.18); border-radius: 50%; pointer-events: none; }
  &::before { width: 460px; height: 460px; right: -210px; top: 105px; box-shadow: 0 0 0 40px rgba(255,255,255,.035), 0 0 0 80px rgba(255,255,255,.025); }
  &::after { width: 280px; height: 280px; left: -175px; bottom: -88px; background: rgba(255,255,255,.07); }

  @media (max-width: ${t.breakpoint.mobile}) {
    min-height: 190px;
    padding: 24px;
    &::before { width: 300px; height: 300px; top: -160px; right: -60px; }
    &::after { width: 200px; height: 200px; bottom: -145px; left: 40%; }
  }
`;

export const Brand = styled.div`
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 11px;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.04em;
  img { display: block; width: 36px; height: 36px; border-radius: 11px; background: #fff; }
`;

export const WelcomeCopy = styled.div`
  z-index: 1;
  max-width: 430px;
  padding-bottom: 16px;
  h1 { margin: 0 0 16px; font-size: clamp(34px, 4vw, 48px); line-height: 1.2; letter-spacing: -0.055em; }
  p { max-width: 360px; margin: 0; color: rgba(255,255,255,.82); font-size: 16px; line-height: 1.75; }
  @media (max-width: ${t.breakpoint.mobile}) { display: none; }
`;

export const FormPanel = styled.section`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 56px;
  @media (max-width: ${t.breakpoint.mobile}) { padding: 32px 24px 28px; }
`;

export const FormContent = styled.div`
  width: 100%;
  max-width: 390px;
  h2 { margin: 0; color: ${t.color.ink}; font-size: 30px; letter-spacing: -0.05em; }
  > p { margin: 9px 0 30px; color: ${t.color.muted}; font-size: 14px; line-height: 1.6; }
`;

export const LoginForm = styled.form`
  display: grid;
  gap: 18px;
`;

export const PasswordToggle = styled.button`
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  place-items: center;
  border: 0;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  img { width: 20px; height: 20px; opacity: .55; }
  &:focus-visible { outline: 3px solid ${t.color.focus}; }
`;

export const SignupHint = styled.p`
  margin: 18px 0 0 !important;
  text-align: center;
  color: ${t.color.muted};
  font-size: 14px;
  a { margin-left: 5px; color: ${t.color.primary}; font-weight: 700; text-decoration: none; }
  a:hover { text-decoration: underline; }
`;

export const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 28px 0 18px;
  color: ${t.color.subtle};
  font-size: 12px;
  &::before, &::after { content: ""; height: 1px; flex: 1; background: ${t.color.line}; }
`;

export const OAuthActions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

export const OAuthButton = styled.button`
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid ${t.color.line};
  border-radius: ${t.radius.md};
  background: ${t.color.surface};
  color: ${t.color.ink};
  font: 600 14px ${t.type.family};
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease;
  &:hover { border-color: #bdcad9; background: ${t.color.canvas}; }
  &:focus-visible { outline: 3px solid ${t.color.focus}; outline-offset: 2px; }
  &:disabled { cursor: not-allowed; opacity: .55; }
  img { width: 19px; height: 19px; object-fit: contain; }
`;

export const FooterNote = styled.p`
  margin: 28px 0 0 !important;
  text-align: center;
  color: ${t.color.subtle} !important;
  font-size: 12px !important;
`;
