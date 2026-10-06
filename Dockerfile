FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm install -g tsx

ENV PORT=3000
EXPOSE 3000

CMD ["tsx", "server.ts"]
