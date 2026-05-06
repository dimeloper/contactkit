FROM node:20-alpine AS base
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/server/package.json ./packages/server/

# Install production deps only
RUN pnpm install --frozen-lockfile --filter @contactkit/server

# Copy source
COPY tsconfig.base.json ./
COPY packages/server ./packages/server

# Build
RUN pnpm --filter @contactkit/server build

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "packages/server/dist/server.js"]
