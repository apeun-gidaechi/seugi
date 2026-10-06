FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile
COPY apps/api apps/api
COPY packages/contracts packages/contracts
RUN pnpm --filter @seugi/api build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production DATA_FILE=/data/seugi.json UPLOAD_DIR=/data/uploads PORT=8080
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json
EXPOSE 8080
VOLUME ["/data"]
CMD ["node", "dist/server.js"]
