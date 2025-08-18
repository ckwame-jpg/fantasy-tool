# Next.js 15 on Node 20-alpine for dev with hot reload
FROM node:20-alpine

WORKDIR /app

# Install deps (use lockfile if present)
COPY package.json package-lock.json* ./
RUN npm install

# Copy app
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=development \
    PORT=3000

EXPOSE 3000

# Dev server with hot reload
CMD ["npm", "run", "dev"]
