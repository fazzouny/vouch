# Delegation Gatekeeper gateway — production image
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages packages
COPY gateway gateway
COPY policy-engine policy-engine
COPY adapters adapters
COPY sdk sdk
COPY src src
COPY tsconfig.json ./
RUN npm ci && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/gateway/dist ./gateway/dist
COPY --from=builder /app/policy-engine/dist ./policy-engine/dist
COPY --from=builder /app/packages ./packages
EXPOSE 3040
CMD ["node", "dist/gateway/server.js"]
