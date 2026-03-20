FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY public ./public
COPY server.js ./
COPY README.md ./

RUN mkdir -p /app/data/uploads

EXPOSE 3000

CMD ["node", "server.js"]
