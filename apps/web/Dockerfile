FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --filter @seugi/web... --frozen-lockfile
COPY apps/web apps/web
COPY packages/api-client packages/api-client
COPY packages/contracts packages/contracts
ARG VITE_SERVER_URL=http://localhost:8080
ENV VITE_SERVER_URL=${VITE_SERVER_URL}
RUN pnpm --filter @seugi/web build

FROM nginx:stable-alpine AS runner
COPY --from=builder /app/apps/web/dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
EXPOSE 80
