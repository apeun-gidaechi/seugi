import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  return {
    // The monorepo root .env.example owns shared API settings such as VITE_SERVER_URL.
    envDir: resolve(__dirname, "../.."),
    server: {
      host: '0.0.0.0',
      // 개발 환경에서만 https 설정 적용
      // https: mode === 'development' ? {
      //   key: fs.readFileSync(`${__dirname}/certificates/localhost-key.pem`),  // 로컬에서 HTTPS 키 파일 경로
      //   cert: fs.readFileSync(`${__dirname}/certificates/localhost.pem`),      // 로컬에서 HTTPS 인증서 파일 경로
      // } : false,  // 배포 환경에서는 HTTPS 설정 없음
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": `${__dirname}/src`,
      },
    },
  };
});
