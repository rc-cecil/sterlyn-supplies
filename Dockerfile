FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg openssl ca-certificates clamav chromium && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .pnpmfile.cjs ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN node --input-type=module -e 'import {randomBytes} from "node:crypto";import {spawnSync} from "node:child_process";const result=spawnSync("pnpm",["build"],{stdio:"inherit",env:{...process.env,DATABASE_URL:"postgresql://build:build@localhost/build",BETTER_AUTH_SECRET:randomBytes(48).toString("hex")}});process.exit(result.status??1)'
RUN cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/ && mkdir -p .next/standalone/.next/cache/images .next/cache/images && chown -R node:node .next/standalone/.next/cache .next/cache
ENV NODE_ENV=production HOSTNAME=0.0.0.0
USER node
EXPOSE 3000
CMD ["node",".next/standalone/server.js"]
