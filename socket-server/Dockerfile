FROM node:22-alpine AS builder
WORKDIR /app
COPY socket-server/package.json ./package.json
RUN npm install
COPY socket-server/ ./
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY socket-server/package.json ./package.json
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/server.js"]

