# Stage 1: Dependencies
FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Production - Dev Server (for frontend)
FROM dependencies AS production
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --chown=nodejs:nodejs . .
USER nodejs
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
