import nodemailer from "nodemailer";

export async function sendVerificationEmail(email: string, code: string) {
  const host = process.env.SMTP_HOST; const from = process.env.SMTP_FROM;
  if (!host || !from) { if (process.env.NODE_ENV === "production") throw new Error("SMTP_HOST와 SMTP_FROM이 필요합니다"); console.info(`[development] verification for ${email}: ${code}`); return; }
  const transport = nodemailer.createTransport({ host, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_SECURE === "true", auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined });
  await transport.sendMail({ from, to: email, subject: "[Seugi] 이메일 인증 코드", text: `인증 코드: ${code}\n10분 안에 입력해 주세요.` });
}
