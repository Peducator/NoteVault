FROM node:20-alpine AS staging

WORKDIR /app
RUN apk add --no-cache libc6-compat

# Chỉ copy manifest để cache npm ci
COPY package.json package-lock.json ./
RUN npm ci

# Copy toàn bộ code và build
COPY . .

ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN npm run build

EXPOSE 3000

USER node

CMD ["npm", "run", "start"]
