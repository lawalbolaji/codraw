# pre-build stage
FROM node:latest as build

ARG VITE_BASE_URL

RUN apt-get update

WORKDIR /usr/src/codraw

COPY client/package.json package-lock.json ./

RUN npm ci

ENV VITE_BASE_URL=${VITE_BASE_URL}
ENV NODE_ENV=production

COPY client/ ./

RUN npm run build

# production stage
FROM nginx:1.21-alpine

WORKDIR /usr/src/codraw

COPY --from=build /usr/src/codraw/dist /usr/share/nginx/html
