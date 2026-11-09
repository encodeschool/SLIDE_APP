FROM node:22-alpine AS build
WORKDIR /workspace
COPY apps/web/package.json apps/web/package-lock.json ./apps/web/
RUN cd apps/web && npm ci
COPY apps/web/index.html apps/web/tsconfig.json apps/web/vite.config.ts ./apps/web/
COPY apps/web/src ./apps/web/src
COPY packages/shared-types/src ./packages/shared-types/src
COPY docs ./docs
ARG VITE_API_URL=https://api-slides.encode.uz
RUN cd apps/web && VITE_API_URL="${VITE_API_URL}" npm run build

FROM nginx:1.27-alpine
COPY infra/deployment/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
