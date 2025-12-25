# ===== Build Stage =====
FROM node:20-alpine AS builder
# รับค่าจาก docker-compose
ARG API_BASE_URL
ARG VITE_APP_NAME
ARG VITE_APP_VERSION

# set environment variables (optional)
ENV API_BASE_URL=$API_BASE_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION

WORKDIR /app

COPY package.json ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install 

# Copy source code and deps
COPY . .

# Build the app
# Add NODE_OPTIONS fix out of memory pnpm build
RUN pnpm build

# Remove dev dependencies
RUN rm -rf node_modules

# ===== Production Stage =====
FROM alpine:3.18 AS production

# ติดตั้ง Caddy จาก official repo
RUN apk add --no-cache caddy

COPY --from=builder /app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
