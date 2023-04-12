FROM node:18.15.0-alpine3.17 AS base

RUN apk update && apk add git
RUN npm i -g pnpm

FROM base AS install

WORKDIR /app
COPY lefthook.yml package.json pnpm-lock.yaml ./
COPY .git ./app/.git
RUN pnpm install

FROM base AS build

WORKDIR /app
COPY . .
COPY --from=install /app/node_modules ./node_modules
RUN pnpm build

FROM base AS app

WORKDIR /app
COPY --from=build /app/build ./build/
COPY --from=build /app/node_modules ./node_modules

CMD [ "node", "build/server.js" ]
