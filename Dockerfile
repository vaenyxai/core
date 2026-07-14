FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN npm ci

COPY . .

RUN npm run build

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV VAENYX_HOST=0.0.0.0
ENV VAENYX_PORT=3000
ENV VAENYX_DATA_DIR=/app/data
ENV VAENYX_MIGRATIONS_DIR=./migrations
ENV VAENYX_WEB_DIST=../web/dist

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN npm ci --omit=dev

COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/apps/server/migrations apps/server/migrations
COPY --from=build /app/apps/web/dist apps/web/dist
COPY --from=build /app/packages/contracts/dist packages/contracts/dist

EXPOSE 3000

CMD ["npm", "run", "start"]
