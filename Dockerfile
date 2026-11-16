# Single image: Next.js serves both the API and the UI. SQLite lives in /data.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production DATABASE_PATH=/data/salary.db PORT=3000
COPY --from=build /app ./
RUN mkdir -p /data
EXPOSE 3000
# Seeds 10,000 employees on first boot only, then serves the app.
CMD ["npm", "start"]
