# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app
COPY app/package.json ./
# Need to create lock file if absent, or use npm install directly
RUN npm install

COPY app/ ./
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Include custom nginx config if needed for SPA routing (fallback to index.html)
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
