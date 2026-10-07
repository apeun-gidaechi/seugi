FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --filter @seugi/web... --frozen-lockfile
COPY apps/web apps/web
ARG VITE_SERVER_URL=http://localhost:8080
ENV VITE_SERVER_URL=${VITE_SERVER_URL}
RUN pnpm --filter @seugi/web build

FROM nginx:stable-alpine AS runner
COPY --from=builder /app/apps/web/dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
EXPOSE 80
