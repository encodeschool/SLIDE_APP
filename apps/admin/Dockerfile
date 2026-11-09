FROM node:22-alpine AS build
WORKDIR /workspace
COPY apps/admin/package.json apps/admin/package-lock.json ./apps/admin/
RUN cd apps/admin && npm ci
COPY apps/admin/index.html apps/admin/tsconfig.json apps/admin/vite.config.ts ./apps/admin/
COPY apps/admin/src ./apps/admin/src
COPY docs ./docs
ARG VITE_API_URL=https://api-slides.encode.uz
RUN cd apps/admin && VITE_API_URL="${VITE_API_URL}" npm run build

FROM nginx:1.27-alpine
COPY infra/deployment/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/admin/dist /usr/share/nginx/html
EXPOSE 8080
