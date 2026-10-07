import React from "react";
import * as S from "./login.style";
import { Button, TextField } from "@/Components/ui";
import CustomAlert from "@/Components/Alert/Alert";
import seugiImg from "@/Assets/image/onbording/Start/seugilogo.svg";
import showPasswordImg from "@/Assets/image/onbording/show_fill.svg";
import hidePasswordImg from "@/Assets/image/onbording/hide_fill.svg";
import appleLogo from "@/Assets/image/onbording/Start/apple.svg";
import googleLogo from "@/Assets/image/onbording/Start/googlelogo.svg";
import useLogin from "@/Hooks/OnBording/LoginHook/index";

const Login = ({ googleLoginEnabled = true }: { googleLoginEnabled?: boolean }) => {
  const login = useLogin();

  return (
    <S.LoginMain>
      <S.LoginFrame>
        <S.WelcomePanel aria-label="Seugi 소개">
          <S.Brand><img src={seugiImg} alt="" /> Seugi</S.Brand>
          <S.WelcomeCopy>
            <h1>학교의 하루를<br />더 가볍게.</h1>
            <p>수업과 소통, 학교 생활에 필요한 모든 것을 한곳에서 시작해 보세요.</p>
          </S.WelcomeCopy>
        </S.WelcomePanel>

        <S.FormPanel>
          <S.FormContent>
            <h2>다시 만나 반가워요</h2>
            <p>Seugi 계정으로 로그인하고 학교 공간으로 이동하세요.</p>
            <S.LoginForm onSubmit={(event) => { event.preventDefault(); void login.handleLogin(); }}>
              <TextField
                id="login-email"
                label="이메일"
                autoComplete="username"
                type="email"
                value={login.email}
                onChange={(event) => login.setEmail(event.target.value)}
                placeholder="name@school.kr"
                required
              />
              <TextField
                id="login-password"
                label="비밀번호"
                autoComplete="current-password"
                type={login.showPassword ? "text" : "password"}
                value={login.password}
                onChange={(event) => login.setPassword(event.target.value)}
                placeholder="비밀번호를 입력해 주세요"
                required
                trailing={(
                  <S.PasswordToggle type="button" onClick={() => login.setShowPassword(!login.showPassword)} aria-label={login.showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}>
                    <img src={login.showPassword ? hidePasswordImg : showPasswordImg} alt="" />
                  </S.PasswordToggle>
                )}
              />
              <Button type="submit" fullWidth>로그인</Button>
            </S.LoginForm>
            <S.SignupHint>아직 계정이 없으신가요?<a href="https://www.seugi.com/emailsignup">회원가입</a></S.SignupHint>
            <S.Divider>또는 간편 로그인</S.Divider>
            <S.OAuthActions>
              <S.OAuthButton type="button" onClick={login.handleGoogleLogin} disabled={!googleLoginEnabled} title={!googleLoginEnabled ? "Google 로그인 설정이 필요합니다" : undefined}><img src={googleLogo} alt="" />Google</S.OAuthButton>
              <S.OAuthButton type="button" onClick={login.handleAppleLogin}><img src={appleLogo} alt="" />Apple</S.OAuthButton>
            </S.OAuthActions>
            <S.FooterNote>로그인하면 Seugi 서비스 이용약관에 동의한 것으로 간주됩니다.</S.FooterNote>
          </S.FormContent>
        </S.FormPanel>
      </S.LoginFrame>
      {login.showAlert && (
        <CustomAlert position="" titletext="로그인 오류" subtext={login.alertMessage} onClose={login.handleCloseAlert} />
      )}
    </S.LoginMain>
  );
};

export default Login;
