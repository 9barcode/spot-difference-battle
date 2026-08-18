FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY UI/package.json UI/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/game-core/package.json packages/game-core/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm --filter @spot-battle/server deploy --prod --legacy /app
RUN cp -R UI/dist /app/public

FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001 \
    WEB_ROOT=/app/public
WORKDIR /app

COPY --from=build /app ./

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["sh", "-c", "if [ -n \"$DATABASE_URL\" ]; then node dist/migrate.js; fi; exec node dist/index.js"]
