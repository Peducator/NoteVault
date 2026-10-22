FROM node:20-alpine AS staging

WORKDIR /app

# Cài đặt công cụ build cần thiết cho thư viện native và OpenSSL cho Prisma
RUN apk add --no-cache python3 make g++ openssl libc6-compat

# Chỉ copy manifest để cache npm ci
COPY package.json package-lock.json ./
RUN npm ci

# Copy toàn bộ code và sinh Prisma Client
COPY . .
RUN npx prisma generate

ENV NODE_ENV=staging
ENV PORT=5000

EXPOSE 5000

RUN chown -R node:node /app
USER node

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node app.js"]
