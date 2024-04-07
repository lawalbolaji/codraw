# pre-build stage
FROM node:latest as build

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init

WORKDIR /usr/src/hive

# We are using the project root folder as context
COPY hive/package.json package-lock.json ./

RUN npm ci

ENV NODE_ENV production

COPY hive/ ./

RUN npm run build

# production stage
FROM node:20.11.1-bullseye-slim

# needs curl for the healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl

ENV NODE_ENV production

ARG PORT

# dumb-init - lihghtweight process to run as pid  1 so node doesn't have to
# will help us handle exit signals in node gracefully, ref: https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#handling-kernel-signals
COPY --from=build /usr/bin/dumb-init /usr/bin/dumb-init

USER node

WORKDIR /usr/src/hive

COPY --chown=node:node --from=build /usr/src/hive/dist ./
COPY --chown=node:node --from=build /usr/src/hive/package.json /usr/src/hive/package-lock.json ./
RUN npm ci --omit=dev

EXPOSE ${PORT}

CMD ["dumb-init", "node", "index.js"]
